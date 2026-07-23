/**
 * FT-N1 — Notion Document Generator Adapter Types
 *
 * Layer 3 (STACK_COUPLED) domain types for the Notion Apps platform.
 * Shared document generation engine types are platform-neutral.
 *
 * FLOW-34 FC-24: CLIENT_BUILD = webpack (Notion Apps SDK constraint).
 */

export interface NotionBlock {
  id: string;
  type: 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3' | 'to_do' | 'bulleted_list_item' | 'image';
  content: string;
  checked?: boolean;
  level?: 1 | 2 | 3;
  src?: string;
}

export interface SharedDocElement {
  type: 'PARAGRAPH' | 'HEADING' | 'TODO' | 'LIST_ITEM' | 'IMAGE';
  content: string;
  checked?: boolean;
  level?: number;
  src?: string;
}

export interface SharedDocStyle {
  fontSize: number;
  fontWeight: 'Regular' | 'Bold';
  color: string;
  blockType: 'PARAGRAPH' | 'HEADING' | 'TODO' | 'LIST_ITEM' | 'IMAGE';
}

export interface DocGenerationOutput {
  markdown: string;
  html: string;
}

export interface NotionWritePayload {
  type: NotionBlock['type'];
  fontSize: number;
  fontWeight: 'Regular' | 'Bold';
}

export interface DocAdapterReadResult {
  elements: SharedDocElement[];
  styles: SharedDocStyle[];
  sourceBlocks: NotionBlock[];
}

export interface DocAdapterWriteResult {
  written: number;
  failed: number;
}

export interface DocEnhancedOutput {
  element: SharedDocElement;
  style: SharedDocStyle;
  generated: DocGenerationOutput;
}
