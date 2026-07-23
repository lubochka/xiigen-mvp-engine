/**
 * FLOW-34 — CH1 Chrome AI Page Analyzer Adapter Tests
 * (Master plan: CH = Chrome prefix. CH1 = AI Page Analyzer.)
 * 26 tests: CH1-R-1..10, CH1-W-1..8, CH1-E-1..4, CH1-P-1..4
 */

import {
  mapDOMToPageElement,
  mapDOMToPageStyle,
  mapPageStyleToDOM,
  readPageDOM,
  writePageAnalysis,
} from '../../../adapters/chrome/FT-CH1/src/chrome-adapter';
import type {
  ChromeDOMElement,
  SharedPageStyle,
  SharedPageElement,
} from '../../../adapters/chrome/FT-CH1/src/types';

function makeDOMElement(overrides: Partial<ChromeDOMElement> = {}): ChromeDOMElement {
  return { tagName: 'H1', textContent: 'Welcome to XIIGen', className: 'hero-title', ...overrides };
}

const CANONICAL_ELEMENT: SharedPageElement = {
  type: 'HEADING',
  content: 'Welcome to XIIGen',
  src: undefined,
  href: undefined,
  level: 1,
};
const CANONICAL_STYLE: SharedPageStyle = {
  elementRole: 'HEADING',
  importance: 'HIGH',
  contentDensity: 'sparse',
};
const ANALYSIS_RESULT = { issues: [], suggestions: ['Add aria-label'] };

// ── READ: mapDOMToPageElement (CH1-R-1..5) ────────────────────────────────────

describe('FLOW-34 CH1 — READ path: mapDOMToPageElement', () => {
  it('CH1-R-1: H1 → HEADING type with level 1', () => {
    const el = mapDOMToPageElement(makeDOMElement({ tagName: 'H1' }));
    expect(el.type).toBe('HEADING');
    expect(el.level).toBe(1);
  });
  it('CH1-R-2: H2/H3 map to HEADING with correct level', () => {
    expect(mapDOMToPageElement(makeDOMElement({ tagName: 'H2' })).level).toBe(2);
    expect(mapDOMToPageElement(makeDOMElement({ tagName: 'H3' })).level).toBe(3);
  });
  it('CH1-R-3: P/IMG/BUTTON/A map correctly', () => {
    expect(mapDOMToPageElement(makeDOMElement({ tagName: 'P' })).type).toBe('PARAGRAPH');
    expect(mapDOMToPageElement(makeDOMElement({ tagName: 'IMG' })).type).toBe('IMAGE');
    expect(mapDOMToPageElement(makeDOMElement({ tagName: 'BUTTON' })).type).toBe('CTA');
    expect(mapDOMToPageElement(makeDOMElement({ tagName: 'A' })).type).toBe('LINK');
  });
  it('CH1-R-4: textContent preserved as content', () => {
    expect(mapDOMToPageElement(makeDOMElement({ textContent: 'Sign up now' })).content).toBe(
      'Sign up now',
    );
  });
  it('CH1-R-5: src and href preserved', () => {
    const el = mapDOMToPageElement(
      makeDOMElement({ tagName: 'IMG', src: 'hero.png', href: undefined }),
    );
    expect(el.src).toBe('hero.png');
    const link = mapDOMToPageElement(makeDOMElement({ tagName: 'A', href: '/pricing' }));
    expect(link.href).toBe('/pricing');
  });
});

// ── READ: mapDOMToPageStyle (CH1-R-6..10) ─────────────────────────────────────

describe('FLOW-34 CH1 — READ path: mapDOMToPageStyle', () => {
  it('CH1-R-6: H1/BUTTON → HIGH importance', () => {
    expect(mapDOMToPageStyle(makeDOMElement({ tagName: 'H1' })).importance).toBe('HIGH');
    expect(mapDOMToPageStyle(makeDOMElement({ tagName: 'BUTTON' })).importance).toBe('HIGH');
  });
  it('CH1-R-7: H2/H3/A → MEDIUM importance', () => {
    expect(mapDOMToPageStyle(makeDOMElement({ tagName: 'H2' })).importance).toBe('MEDIUM');
    expect(mapDOMToPageStyle(makeDOMElement({ tagName: 'A' })).importance).toBe('MEDIUM');
  });
  it('CH1-R-8: P/IMG/DIV → LOW importance', () => {
    expect(mapDOMToPageStyle(makeDOMElement({ tagName: 'P' })).importance).toBe('LOW');
    expect(mapDOMToPageStyle(makeDOMElement({ tagName: 'IMG' })).importance).toBe('LOW');
  });
  it('CH1-R-9: short text → sparse contentDensity', () => {
    expect(mapDOMToPageStyle(makeDOMElement({ textContent: 'Short' })).contentDensity).toBe(
      'sparse',
    );
  });
  it('CH1-R-10: long text → dense contentDensity', () => {
    expect(mapDOMToPageStyle(makeDOMElement({ textContent: 'x'.repeat(600) })).contentDensity).toBe(
      'dense',
    );
  });
});

// ── WRITE: mapPageStyleToDOM (CH1-W-1..4) ─────────────────────────────────────

describe('FLOW-34 CH1 — WRITE path: mapPageStyleToDOM', () => {
  it('CH1-W-1: HEADING → H1 tagName', () => {
    expect(mapPageStyleToDOM({ ...CANONICAL_STYLE, elementRole: 'HEADING' }).tagName).toBe('H1');
  });
  it('CH1-W-2: PARAGRAPH/IMAGE/CTA/LINK map correctly', () => {
    expect(mapPageStyleToDOM({ ...CANONICAL_STYLE, elementRole: 'PARAGRAPH' }).tagName).toBe('P');
    expect(mapPageStyleToDOM({ ...CANONICAL_STYLE, elementRole: 'IMAGE' }).tagName).toBe('IMG');
    expect(mapPageStyleToDOM({ ...CANONICAL_STYLE, elementRole: 'CTA' }).tagName).toBe('BUTTON');
    expect(mapPageStyleToDOM({ ...CANONICAL_STYLE, elementRole: 'LINK' }).tagName).toBe('A');
  });
  it('CH1-W-3: SECTION → SECTION tagName', () => {
    expect(mapPageStyleToDOM({ ...CANONICAL_STYLE, elementRole: 'SECTION' }).tagName).toBe(
      'SECTION',
    );
  });
  it('CH1-W-4: only tagName in write payload (no importance/contentDensity)', () => {
    const result = mapPageStyleToDOM(CANONICAL_STYLE);
    expect('importance' in result).toBe(false);
    expect('contentDensity' in result).toBe(false);
  });
});

// ── WRITE: writePageAnalysis (CH1-W-5..8) ─────────────────────────────────────

describe('FLOW-34 CH1 — WRITE path: writePageAnalysis', () => {
  it('CH1-W-5: writer called once, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writePageAnalysis(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, analysisResult: ANALYSIS_RESULT }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('CH1-W-6: payload type=PAGE_ANALYSIS, elementRole=HEADING, importance=HIGH, content, issues, suggestions', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writePageAnalysis(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, analysisResult: ANALYSIS_RESULT }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('PAGE_ANALYSIS');
    expect(payload['elementRole']).toBe('HEADING');
    expect(payload['importance']).toBe('HIGH');
    expect(payload['content']).toBe('Welcome to XIIGen');
    expect(payload['suggestions']).toEqual(['Add aria-label']);
  });
  it('CH1-W-7: writer failure → failed incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Chrome runtime error'));
    const result = await writePageAnalysis(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, analysisResult: ANALYSIS_RESULT }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('CH1-W-8: writes multiple elements in order', async () => {
    const roles: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      roles.push(p['elementRole'] as string);
    });
    await writePageAnalysis(
      [
        {
          element: CANONICAL_ELEMENT,
          style: { ...CANONICAL_STYLE, elementRole: 'HEADING' },
          analysisResult: ANALYSIS_RESULT,
        },
        {
          element: { ...CANONICAL_ELEMENT, type: 'CTA' },
          style: { ...CANONICAL_STYLE, elementRole: 'CTA' },
          analysisResult: ANALYSIS_RESULT,
        },
      ],
      writer,
    );
    expect(roles).toEqual(['HEADING', 'CTA']);
  });
});

// ── Equivalence (CH1-E-1..4) ──────────────────────────────────────────────────

describe('FLOW-34 CH1 — Equivalence: adapter output = shared canonical', () => {
  const el = makeDOMElement();
  it('CH1-E-1: mapDOMToPageElement output identical to canonical element', () => {
    expect(mapDOMToPageElement(el)).toEqual(CANONICAL_ELEMENT);
  });
  it('CH1-E-2: mapDOMToPageStyle output identical to canonical style', () => {
    expect(mapDOMToPageStyle(el)).toEqual(CANONICAL_STYLE);
  });
  it('CH1-E-3: readPageDOM arrays match canonical shapes', () => {
    const { elements, styles } = readPageDOM([el]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('CH1-E-4: READ→WRITE round-trip preserves tagName mapping', () => {
    const shared = mapDOMToPageStyle(el);
    const back = mapPageStyleToDOM(shared);
    expect(back.tagName).toBe('H1');
  });
});

// ── Packaging (CH1-P-1..4) ────────────────────────────────────────────────────

describe('FLOW-34 CH1 — Packaging + manifest checks', () => {
  it('CH1-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapDOMToPageElement).toBe('function');
    expect(typeof mapDOMToPageStyle).toBe('function');
    expect(typeof mapPageStyleToDOM).toBe('function');
    expect(typeof readPageDOM).toBe('function');
    expect(typeof writePageAnalysis).toBe('function');
  });
  it('CH1-P-2: adapter importable without chrome.* APIs', () => {
    expect(mapDOMToPageElement).toBeDefined();
  });
  it('CH1-P-3: package.json name follows @xiigen/chrome-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/chrome/FT-CH1/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/chrome-/);
  });
  it('CH1-P-4: FT-CH1 record in marketplace manifest', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ftCh1 = manifest.features.find((f) => f.ftId === 'FT-CH1');
    expect(ftCh1).toBeDefined();
    expect(ftCh1!.portingCandidate).toBe(true);
    const chrome = ftCh1!.platforms.find((p) => p.platformId === 'chrome');
    expect(chrome).toBeDefined();
    expect(chrome!.adapterMode).toBe('MODE_B');
    expect(chrome!.adapterPath).toContain('FT-CH1');
  });
});
