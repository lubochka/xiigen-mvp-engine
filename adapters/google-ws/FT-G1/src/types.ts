// FT-G1 — Google Workspace Docs AI Writer (UTILITY family)
// Platform: Google Workspace Add-ons (Google Docs). G prefix per master plan.

export interface GoogleDocParagraph {
  id: string;
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'list_item' | 'title';
  text: string;
  bold?: boolean;
  italic?: boolean;
  alignment?: 'START' | 'CENTER' | 'END' | 'JUSTIFIED';
}

export interface SharedDocParagraph {
  type: 'TITLE' | 'HEADING' | 'PARAGRAPH' | 'LIST_ITEM';
  text: string;
  level?: number;   // 1–3 for headings
  alignment?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
}

export interface SharedDocParagraphStyle {
  bold: boolean;
  italic: boolean;
  docRole: 'TITLE' | 'HEADING' | 'PARAGRAPH' | 'LIST_ITEM';
  fontSize: number;
}

export interface DocWriterOutput {
  paragraph: SharedDocParagraph;
  style: SharedDocParagraphStyle;
  generatedText: string;
}

export interface DocReadResult {
  paragraphs: SharedDocParagraph[];
  styles: SharedDocParagraphStyle[];
  sourceParagraphs: GoogleDocParagraph[];
}

export interface DocWriteResult {
  written: number;
  failed: number;
}
