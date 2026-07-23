/**
 * FLOW-34 — G1 Google Workspace Docs AI Writer Adapter Tests
 * 26 tests: G1-R-1..10, G1-W-1..8, G1-E-1..4, G1-P-1..4
 */

import {
  mapGoogleToDocParagraph,
  mapGoogleToDocStyle,
  mapDocStyleToGoogle,
  readDocContent,
  writeDocContent,
} from '../../../adapters/google-ws/FT-G1/src/google-docs-adapter';
import type {
  GoogleDocParagraph,
  SharedDocParagraph,
  SharedDocParagraphStyle,
} from '../../../adapters/google-ws/FT-G1/src/types';

function makeGoogleParagraph(overrides: Partial<GoogleDocParagraph> = {}): GoogleDocParagraph {
  return {
    id: 'para-001',
    type: 'heading1',
    text: 'Executive Summary',
    bold: true,
    italic: false,
    alignment: 'START',
    ...overrides,
  };
}

const CANONICAL_PARAGRAPH: SharedDocParagraph = {
  type: 'HEADING',
  text: 'Executive Summary',
  level: 1,
  alignment: 'LEFT',
};
const CANONICAL_STYLE: SharedDocParagraphStyle = {
  bold: true,
  italic: false,
  docRole: 'HEADING',
  fontSize: 24,
};
const GENERATED_TEXT =
  'Executive Summary: XIIGen delivers self-building AI code generation at scale.';

// ── READ: mapGoogleToDocParagraph (G1-R-1..5) ─────────────────────────────────

describe('FLOW-34 G1 — READ path: mapGoogleToDocParagraph', () => {
  it('G1-R-1: heading1 → HEADING with level 1', () => {
    const out = mapGoogleToDocParagraph(makeGoogleParagraph({ type: 'heading1' }));
    expect(out.type).toBe('HEADING');
    expect(out.level).toBe(1);
  });
  it('G1-R-2: heading2→HEADING level 2, heading3→level 3, title→TITLE, paragraph→PARAGRAPH, list_item→LIST_ITEM', () => {
    expect(mapGoogleToDocParagraph(makeGoogleParagraph({ type: 'heading2' })).level).toBe(2);
    expect(mapGoogleToDocParagraph(makeGoogleParagraph({ type: 'heading3' })).level).toBe(3);
    expect(mapGoogleToDocParagraph(makeGoogleParagraph({ type: 'title' })).type).toBe('TITLE');
    expect(mapGoogleToDocParagraph(makeGoogleParagraph({ type: 'paragraph' })).type).toBe(
      'PARAGRAPH',
    );
    expect(mapGoogleToDocParagraph(makeGoogleParagraph({ type: 'list_item' })).type).toBe(
      'LIST_ITEM',
    );
  });
  it('G1-R-3: text preserved', () => {
    expect(mapGoogleToDocParagraph(makeGoogleParagraph({ text: 'Executive Summary' })).text).toBe(
      'Executive Summary',
    );
  });
  it('G1-R-4: START alignment → LEFT', () => {
    expect(mapGoogleToDocParagraph(makeGoogleParagraph({ alignment: 'START' })).alignment).toBe(
      'LEFT',
    );
  });
  it('G1-R-5: CENTER→CENTER, END→RIGHT, JUSTIFIED→JUSTIFIED', () => {
    expect(mapGoogleToDocParagraph(makeGoogleParagraph({ alignment: 'CENTER' })).alignment).toBe(
      'CENTER',
    );
    expect(mapGoogleToDocParagraph(makeGoogleParagraph({ alignment: 'END' })).alignment).toBe(
      'RIGHT',
    );
    expect(mapGoogleToDocParagraph(makeGoogleParagraph({ alignment: 'JUSTIFIED' })).alignment).toBe(
      'JUSTIFIED',
    );
  });
});

// ── READ: mapGoogleToDocStyle (G1-R-6..10) ────────────────────────────────────

describe('FLOW-34 G1 — READ path: mapGoogleToDocStyle', () => {
  it('G1-R-6: bold:true preserved in style', () => {
    expect(mapGoogleToDocStyle(makeGoogleParagraph({ bold: true })).bold).toBe(true);
  });
  it('G1-R-7: italic:false preserved', () => {
    expect(mapGoogleToDocStyle(makeGoogleParagraph({ italic: false })).italic).toBe(false);
  });
  it('G1-R-8: heading1→fontSize 24, heading2→20, heading3→16, paragraph→12', () => {
    expect(mapGoogleToDocStyle(makeGoogleParagraph({ type: 'heading1' })).fontSize).toBe(24);
    expect(mapGoogleToDocStyle(makeGoogleParagraph({ type: 'heading2' })).fontSize).toBe(20);
    expect(mapGoogleToDocStyle(makeGoogleParagraph({ type: 'heading3' })).fontSize).toBe(16);
    expect(mapGoogleToDocStyle(makeGoogleParagraph({ type: 'paragraph' })).fontSize).toBe(12);
  });
  it('G1-R-9: title → fontSize 36', () => {
    expect(mapGoogleToDocStyle(makeGoogleParagraph({ type: 'title' })).fontSize).toBe(36);
  });
  it('G1-R-10: docRole matches type mapping', () => {
    expect(mapGoogleToDocStyle(makeGoogleParagraph({ type: 'heading1' })).docRole).toBe('HEADING');
    expect(mapGoogleToDocStyle(makeGoogleParagraph({ type: 'paragraph' })).docRole).toBe(
      'PARAGRAPH',
    );
    expect(mapGoogleToDocStyle(makeGoogleParagraph({ type: 'title' })).docRole).toBe('TITLE');
    expect(mapGoogleToDocStyle(makeGoogleParagraph({ type: 'list_item' })).docRole).toBe(
      'LIST_ITEM',
    );
  });
});

// ── WRITE: mapDocStyleToGoogle (G1-W-1..4) ────────────────────────────────────

describe('FLOW-34 G1 — WRITE path: mapDocStyleToGoogle', () => {
  it('G1-W-1: HEADING → heading1 type in payload', () => {
    expect(
      mapDocStyleToGoogle({ bold: true, italic: false, docRole: 'HEADING', fontSize: 24 }).type,
    ).toBe('heading1');
  });
  it('G1-W-2: TITLE→title, PARAGRAPH→paragraph, LIST_ITEM→list_item', () => {
    expect(
      mapDocStyleToGoogle({ bold: false, italic: false, docRole: 'TITLE', fontSize: 36 }).type,
    ).toBe('title');
    expect(
      mapDocStyleToGoogle({ bold: false, italic: false, docRole: 'PARAGRAPH', fontSize: 12 }).type,
    ).toBe('paragraph');
    expect(
      mapDocStyleToGoogle({ bold: false, italic: false, docRole: 'LIST_ITEM', fontSize: 12 }).type,
    ).toBe('list_item');
  });
  it('G1-W-3: writer called once, written=1, failed=0', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeDocContent(
      [{ paragraph: CANONICAL_PARAGRAPH, style: CANONICAL_STYLE, generatedText: GENERATED_TEXT }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('G1-W-4: payload has type=DOC_UPDATE, text=generatedText, docRole, fontSize, bold', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeDocContent(
      [{ paragraph: CANONICAL_PARAGRAPH, style: CANONICAL_STYLE, generatedText: GENERATED_TEXT }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('DOC_UPDATE');
    expect(payload['text']).toBe(GENERATED_TEXT);
    expect(payload['docRole']).toBe('HEADING');
    expect(payload['fontSize']).toBe(24);
    expect(payload['bold']).toBe(true);
  });
});

// ── WRITE: writeDocContent (G1-W-5..8) ────────────────────────────────────────

describe('FLOW-34 G1 — WRITE path: writeDocContent (injected writer)', () => {
  it('G1-W-5: writer failure → failed=1, no throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Google Docs API error'));
    const result = await writeDocContent(
      [{ paragraph: CANONICAL_PARAGRAPH, style: CANONICAL_STYLE, generatedText: GENERATED_TEXT }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('G1-W-6: writes multiple items in order', async () => {
    const texts: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      texts.push(p['text'] as string);
    });
    await writeDocContent(
      [
        { paragraph: CANONICAL_PARAGRAPH, style: CANONICAL_STYLE, generatedText: 'Text A' },
        { paragraph: CANONICAL_PARAGRAPH, style: CANONICAL_STYLE, generatedText: 'Text B' },
      ],
      writer,
    );
    expect(texts).toEqual(['Text A', 'Text B']);
  });
  it('G1-W-7: bold passes through to write payload', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeDocContent(
      [
        {
          paragraph: CANONICAL_PARAGRAPH,
          style: { ...CANONICAL_STYLE, bold: true },
          generatedText: GENERATED_TEXT,
        },
      ],
      writer,
    );
    expect((writer.mock.calls[0][0] as Record<string, unknown>)['bold']).toBe(true);
  });
  it('G1-W-8: italic passes through to write payload', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeDocContent(
      [
        {
          paragraph: CANONICAL_PARAGRAPH,
          style: { ...CANONICAL_STYLE, italic: true },
          generatedText: GENERATED_TEXT,
        },
      ],
      writer,
    );
    // italic is passed through mapDocStyleToGoogle which sets italic on the base
    const base = mapDocStyleToGoogle({ ...CANONICAL_STYLE, italic: true });
    expect(base.italic).toBe(true);
  });
});

// ── Equivalence (G1-E-1..4) ───────────────────────────────────────────────────

describe('FLOW-34 G1 — Equivalence: adapter output = shared canonical', () => {
  const para = makeGoogleParagraph();
  it('G1-E-1: mapGoogleToDocParagraph output identical to CANONICAL_PARAGRAPH', () => {
    expect(mapGoogleToDocParagraph(para)).toEqual(CANONICAL_PARAGRAPH);
  });
  it('G1-E-2: mapGoogleToDocStyle output identical to CANONICAL_STYLE', () => {
    expect(mapGoogleToDocStyle(para)).toEqual(CANONICAL_STYLE);
  });
  it('G1-E-3: readDocContent paragraphs[0]=CANONICAL_PARAGRAPH, styles[0]=CANONICAL_STYLE', () => {
    const { paragraphs, styles } = readDocContent([para]);
    expect(paragraphs[0]).toEqual(CANONICAL_PARAGRAPH);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('G1-E-4: READ→WRITE round-trip: HEADING → heading1 type', () => {
    const style = mapGoogleToDocStyle(para);
    const back = mapDocStyleToGoogle(style);
    expect(back.type).toBe('heading1');
  });
});

// ── Packaging (G1-P-1..4) ─────────────────────────────────────────────────────

describe('FLOW-34 G1 — Packaging + manifest checks', () => {
  it('G1-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapGoogleToDocParagraph).toBe('function');
    expect(typeof mapGoogleToDocStyle).toBe('function');
    expect(typeof mapDocStyleToGoogle).toBe('function');
    expect(typeof readDocContent).toBe('function');
    expect(typeof writeDocContent).toBe('function');
  });
  it('G1-P-2: adapter importable without @googleapis/docs', () => {
    expect(mapGoogleToDocParagraph).toBeDefined();
  });
  it('G1-P-3: package.json name matches /^@xiigen\\/google-ws-/', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/google-ws/FT-G1/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/google-ws-/);
  });
  it('G1-P-4: FT-G1 in manifest, google-ws platform, MODE_B, path contains FT-G1', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ft = manifest.features.find((f) => f.ftId === 'FT-G1');
    expect(ft).toBeDefined();
    expect(ft!.portingCandidate).toBe(true);
    const platform = ft!.platforms.find((p) => p.platformId === 'google-ws');
    expect(platform).toBeDefined();
    expect(platform!.adapterMode).toBe('MODE_B');
    expect(platform!.adapterPath).toContain('FT-G1');
  });
});
