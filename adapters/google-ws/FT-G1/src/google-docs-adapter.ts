// FT-G1 — Google Workspace Docs AI Writer — Layer 3: STACK_COUPLED

import type {
  GoogleDocParagraph, SharedDocParagraph, SharedDocParagraphStyle,
  DocReadResult, DocWriterOutput, DocWriteResult,
} from './types';

const DOC_TYPE_MAP: Record<GoogleDocParagraph['type'], SharedDocParagraph['type']> = {
  title: 'TITLE', heading1: 'HEADING', heading2: 'HEADING', heading3: 'HEADING',
  paragraph: 'PARAGRAPH', list_item: 'LIST_ITEM',
};

const HEADING_LEVEL: Partial<Record<GoogleDocParagraph['type'], number>> = {
  heading1: 1, heading2: 2, heading3: 3,
};

const FONT_SIZE: Record<GoogleDocParagraph['type'], number> = {
  title: 36, heading1: 24, heading2: 20, heading3: 16,
  paragraph: 12, list_item: 12,
};

const ALIGNMENT_MAP: Record<NonNullable<GoogleDocParagraph['alignment']>, SharedDocParagraph['alignment']> = {
  START: 'LEFT', CENTER: 'CENTER', END: 'RIGHT', JUSTIFIED: 'JUSTIFIED',
};

export function mapGoogleToDocParagraph(para: GoogleDocParagraph): SharedDocParagraph {
  return {
    type: DOC_TYPE_MAP[para.type],
    text: para.text,
    level: HEADING_LEVEL[para.type],
    alignment: para.alignment ? ALIGNMENT_MAP[para.alignment] : 'LEFT',
  };
}

export function mapGoogleToDocStyle(para: GoogleDocParagraph): SharedDocParagraphStyle {
  return {
    bold: para.bold ?? false,
    italic: para.italic ?? false,
    docRole: DOC_TYPE_MAP[para.type],
    fontSize: FONT_SIZE[para.type],
  };
}

export function mapDocStyleToGoogle(style: SharedDocParagraphStyle): Partial<GoogleDocParagraph> {
  const ROLE_BACK: Record<SharedDocParagraphStyle['docRole'], GoogleDocParagraph['type']> = {
    TITLE: 'title', HEADING: 'heading1', PARAGRAPH: 'paragraph', LIST_ITEM: 'list_item',
  };
  return {
    type: ROLE_BACK[style.docRole],
    bold: style.bold,
    italic: style.italic,
  };
}

export function readDocContent(paragraphs: GoogleDocParagraph[]): DocReadResult {
  return {
    paragraphs: paragraphs.map(mapGoogleToDocParagraph),
    styles: paragraphs.map(mapGoogleToDocStyle),
    sourceParagraphs: paragraphs,
  };
}

export async function writeDocContent(
  outputs: DocWriterOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<DocWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const base = mapDocStyleToGoogle(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'DOC_UPDATE',
        text: output.generatedText,
        docRole: output.style.docRole,
        fontSize: output.style.fontSize,
        bold: output.style.bold,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
