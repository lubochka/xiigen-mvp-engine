/**
 * FLOW-34 — NOT1 Notion Document Generator Adapter Tests
 * NOTE: Notion marketplace is invite-only / closed. This adapter is a research
 * implementation — not targeting the Notion App Gallery for public publishing.
 * 26 tests: NOT1-R-1..10, NOT1-W-1..8, NOT1-E-1..4, NOT1-P-1..4
 */

import {
  mapNotionToDocElement,
  mapNotionToDocStyle,
  mapDocStyleToNotion,
  readDocument,
  writeToNotion,
} from '../.././../adapters/notion/FT-NOT1/src/notion-adapter';
import type {
  NotionBlock,
  SharedDocStyle,
  SharedDocElement,
} from '../../../adapters/notion/FT-NOT1/src/types';

function makeNotionBlock(overrides: Partial<NotionBlock> = {}): NotionBlock {
  return { id: 'block-001', type: 'paragraph', content: 'Welcome to XIIGen', ...overrides };
}

const CANONICAL_ELEMENT: SharedDocElement = { type: 'PARAGRAPH', content: 'Welcome to XIIGen' };
const CANONICAL_STYLE: SharedDocStyle = {
  fontSize: 16,
  fontWeight: 'Regular',
  color: '#37352f',
  blockType: 'PARAGRAPH',
};
const DOC_OUTPUT = { markdown: '# Welcome to XIIGen', html: '<p>Welcome to XIIGen</p>' };

// ── READ: mapNotionToDocElement (NOT1-R-1..5) ─────────────────────────────────

describe('FLOW-34 NOT1 — READ path: mapNotionToDocElement', () => {
  it('NOT1-R-1: paragraph → PARAGRAPH', () => {
    expect(mapNotionToDocElement(makeNotionBlock({ type: 'paragraph' })).type).toBe('PARAGRAPH');
  });
  it('NOT1-R-2: heading_1/2/3 → HEADING with level', () => {
    const h1 = mapNotionToDocElement(makeNotionBlock({ type: 'heading_1' }));
    expect(h1.type).toBe('HEADING');
    expect(h1.level).toBe(1);
    const h2 = mapNotionToDocElement(makeNotionBlock({ type: 'heading_2' }));
    expect(h2.level).toBe(2);
    const h3 = mapNotionToDocElement(makeNotionBlock({ type: 'heading_3' }));
    expect(h3.level).toBe(3);
  });
  it('NOT1-R-3: to_do → TODO with checked field', () => {
    const todo = mapNotionToDocElement(makeNotionBlock({ type: 'to_do', checked: true }));
    expect(todo.type).toBe('TODO');
    expect(todo.checked).toBe(true);
  });
  it('NOT1-R-4: bulleted_list_item → LIST_ITEM, image → IMAGE with src', () => {
    expect(mapNotionToDocElement(makeNotionBlock({ type: 'bulleted_list_item' })).type).toBe(
      'LIST_ITEM',
    );
    const img = mapNotionToDocElement(makeNotionBlock({ type: 'image', src: 'diagram.png' }));
    expect(img.type).toBe('IMAGE');
    expect(img.src).toBe('diagram.png');
  });
  it('NOT1-R-5: content preserved', () => {
    expect(
      mapNotionToDocElement(makeNotionBlock({ content: 'Architecture overview' })).content,
    ).toBe('Architecture overview');
  });
});

// ── READ: mapNotionToDocStyle (NOT1-R-6..10) ──────────────────────────────────

describe('FLOW-34 NOT1 — READ path: mapNotionToDocStyle', () => {
  it('NOT1-R-6: paragraph → fontSize 16, fontWeight Regular', () => {
    const s = mapNotionToDocStyle(makeNotionBlock({ type: 'paragraph' }));
    expect(s.fontSize).toBe(16);
    expect(s.fontWeight).toBe('Regular');
  });
  it('NOT1-R-7: heading_1 → fontSize 32 Bold, heading_2 → 24 Bold, heading_3 → 20 Bold', () => {
    expect(mapNotionToDocStyle(makeNotionBlock({ type: 'heading_1' })).fontSize).toBe(32);
    expect(mapNotionToDocStyle(makeNotionBlock({ type: 'heading_1' })).fontWeight).toBe('Bold');
    expect(mapNotionToDocStyle(makeNotionBlock({ type: 'heading_2' })).fontSize).toBe(24);
    expect(mapNotionToDocStyle(makeNotionBlock({ type: 'heading_3' })).fontSize).toBe(20);
  });
  it('NOT1-R-8: to_do and bulleted_list_item → fontSize 16 Regular', () => {
    expect(mapNotionToDocStyle(makeNotionBlock({ type: 'to_do' })).fontSize).toBe(16);
    expect(mapNotionToDocStyle(makeNotionBlock({ type: 'bulleted_list_item' })).fontWeight).toBe(
      'Regular',
    );
  });
  it('NOT1-R-9: color is always Notion default #37352f', () => {
    expect(mapNotionToDocStyle(makeNotionBlock({ type: 'heading_1' })).color).toBe('#37352f');
    expect(mapNotionToDocStyle(makeNotionBlock({ type: 'paragraph' })).color).toBe('#37352f');
  });
  it('NOT1-R-10: blockType matches element type mapping', () => {
    expect(mapNotionToDocStyle(makeNotionBlock({ type: 'to_do' })).blockType).toBe('TODO');
    expect(mapNotionToDocStyle(makeNotionBlock({ type: 'bulleted_list_item' })).blockType).toBe(
      'LIST_ITEM',
    );
  });
});

// ── WRITE: mapDocStyleToNotion (NOT1-W-1..4) ──────────────────────────────────

describe('FLOW-34 NOT1 — WRITE path: mapDocStyleToNotion', () => {
  it('NOT1-W-1: PARAGRAPH → paragraph type', () => {
    expect(mapDocStyleToNotion({ ...CANONICAL_STYLE, blockType: 'PARAGRAPH' }).type).toBe(
      'paragraph',
    );
  });
  it('NOT1-W-2: HEADING → heading_1, TODO → to_do, LIST_ITEM → bulleted_list_item', () => {
    expect(mapDocStyleToNotion({ ...CANONICAL_STYLE, blockType: 'HEADING' }).type).toBe(
      'heading_1',
    );
    expect(mapDocStyleToNotion({ ...CANONICAL_STYLE, blockType: 'TODO' }).type).toBe('to_do');
    expect(mapDocStyleToNotion({ ...CANONICAL_STYLE, blockType: 'LIST_ITEM' }).type).toBe(
      'bulleted_list_item',
    );
  });
  it('NOT1-W-3: fontSize passes through', () => {
    expect(mapDocStyleToNotion({ ...CANONICAL_STYLE, fontSize: 32 }).fontSize).toBe(32);
  });
  it('NOT1-W-4: fontWeight passes through', () => {
    expect(mapDocStyleToNotion({ ...CANONICAL_STYLE, fontWeight: 'Bold' }).fontWeight).toBe('Bold');
  });
});

// ── WRITE: writeToNotion (NOT1-W-5..8) ────────────────────────────────────────

describe('FLOW-34 NOT1 — WRITE path: writeToNotion', () => {
  it('NOT1-W-5: writer called once, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeToNotion(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generated: DOC_OUTPUT }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('NOT1-W-6: payload has type=paragraph, content, fontSize=16', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeToNotion(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generated: DOC_OUTPUT }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('paragraph');
    expect(payload['content']).toBe('Welcome to XIIGen');
    expect(payload['fontSize']).toBe(16);
  });
  it('NOT1-W-7: writer failure → failed incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Notion API error'));
    const result = await writeToNotion(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generated: DOC_OUTPUT }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('NOT1-W-8: writes multiple blocks in order', async () => {
    const contents: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      contents.push(p['content'] as string);
    });
    await writeToNotion(
      [
        {
          element: { ...CANONICAL_ELEMENT, content: 'Section A' },
          style: CANONICAL_STYLE,
          generated: DOC_OUTPUT,
        },
        {
          element: { ...CANONICAL_ELEMENT, content: 'Section B' },
          style: CANONICAL_STYLE,
          generated: DOC_OUTPUT,
        },
      ],
      writer,
    );
    expect(contents).toEqual(['Section A', 'Section B']);
  });
});

// ── Equivalence (NOT1-E-1..4) ─────────────────────────────────────────────────

describe('FLOW-34 NOT1 — Equivalence: adapter output = shared canonical', () => {
  const block = makeNotionBlock();
  it('NOT1-E-1: mapNotionToDocElement output identical to canonical element', () => {
    expect(mapNotionToDocElement(block)).toEqual(CANONICAL_ELEMENT);
  });
  it('NOT1-E-2: mapNotionToDocStyle output identical to canonical style', () => {
    expect(mapNotionToDocStyle(block)).toEqual(CANONICAL_STYLE);
  });
  it('NOT1-E-3: readDocument arrays match canonical shapes', () => {
    const { elements, styles } = readDocument([block]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('NOT1-E-4: READ→WRITE round-trip preserves type and fontSize', () => {
    const shared = mapNotionToDocStyle(block);
    const back = mapDocStyleToNotion(shared);
    expect(back.type).toBe(block.type);
    expect(back.fontSize).toBe(16);
  });
});

// ── Packaging (NOT1-P-1..4) ───────────────────────────────────────────────────

describe('FLOW-34 NOT1 — Packaging + manifest checks', () => {
  it('NOT1-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapNotionToDocElement).toBe('function');
    expect(typeof mapNotionToDocStyle).toBe('function');
    expect(typeof mapDocStyleToNotion).toBe('function');
    expect(typeof readDocument).toBe('function');
    expect(typeof writeToNotion).toBe('function');
  });
  it('NOT1-P-2: adapter importable without @notionhq/client', () => {
    expect(mapNotionToDocElement).toBeDefined();
  });
  it('NOT1-P-3: package.json name follows @xiigen/notion-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../.././../adapters/notion/FT-NOT1/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/notion-/);
  });
  it('NOT1-P-4: FT-NOT1 record in marketplace manifest (marketplace-closed flag)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          productScope: string;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ftNot1 = manifest.features.find((f) => f.ftId === 'FT-NOT1');
    expect(ftNot1).toBeDefined();
    expect(ftNot1!.portingCandidate).toBe(false); // Notion marketplace is closed — not a porting candidate
    const notion = ftNot1!.platforms.find((p) => p.platformId === 'notion');
    expect(notion).toBeDefined();
    expect(notion!.adapterMode).toBe('MODE_B');
    expect(notion!.adapterPath).toContain('FT-NOT1');
  });
});
