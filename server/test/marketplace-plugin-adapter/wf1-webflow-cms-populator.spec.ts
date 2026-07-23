/**
 * FLOW-34 — WF1 Webflow AI CMS Content Populator Adapter Tests
 * (Master plan: WF = Webflow prefix. WF1 = AI CMS Content Populator.)
 * 26 tests: WF1-R-1..10, WF1-W-1..8, WF1-E-1..4, WF1-P-1..4
 */

import {
  mapWebflowToContentElement,
  mapWebflowToContentStyle,
  mapCmsStyleToWebflow,
  readCmsCollection,
  writeCmsContent,
} from '../.././../adapters/webflow/FT-WF1/src/webflow-adapter';
import type {
  WebflowCmsItem,
  SharedCmsStyle,
  SharedCmsElement,
} from '../../../adapters/webflow/FT-WF1/src/types';

function makeWebflowCmsItem(overrides: Partial<WebflowCmsItem> = {}): WebflowCmsItem {
  return {
    id: 'item-001',
    slug: 'ai-in-design',
    name: 'AI in Design',
    fieldData: {},
    collectionId: 'col-001',
    collectionName: 'Blog Posts',
    status: 'draft',
    ...overrides,
  };
}

const CANONICAL_ELEMENT: SharedCmsElement = {
  type: 'CMS_ITEM',
  name: 'AI in Design',
  slug: 'ai-in-design',
  status: 'DRAFT',
  collectionName: 'Blog Posts',
};
const CANONICAL_STYLE: SharedCmsStyle = {
  contentLength: 'medium',
  contentTone: 'informative',
  itemType: 'CMS_ITEM',
};
const GENERATED_CONTENT = 'AI is transforming design workflows...';

// ── READ: mapWebflowToContentElement (WF1-R-1..5) ────────────────────────────

describe('FLOW-34 WF1 — READ path: mapWebflowToContentElement', () => {
  it('WF1-R-1: type is always CMS_ITEM', () => {
    expect(mapWebflowToContentElement(makeWebflowCmsItem()).type).toBe('CMS_ITEM');
  });
  it('WF1-R-2: name preserved', () => {
    expect(
      mapWebflowToContentElement(makeWebflowCmsItem({ name: 'Design Tokens Guide' })).name,
    ).toBe('Design Tokens Guide');
  });
  it('WF1-R-3: slug preserved', () => {
    expect(
      mapWebflowToContentElement(makeWebflowCmsItem({ slug: 'design-tokens-guide' })).slug,
    ).toBe('design-tokens-guide');
  });
  it('WF1-R-4: status draft→DRAFT, published→PUBLISHED, archived→ARCHIVED', () => {
    expect(mapWebflowToContentElement(makeWebflowCmsItem({ status: 'draft' })).status).toBe(
      'DRAFT',
    );
    expect(mapWebflowToContentElement(makeWebflowCmsItem({ status: 'published' })).status).toBe(
      'PUBLISHED',
    );
    expect(mapWebflowToContentElement(makeWebflowCmsItem({ status: 'archived' })).status).toBe(
      'ARCHIVED',
    );
  });
  it('WF1-R-5: collectionName preserved', () => {
    expect(
      mapWebflowToContentElement(makeWebflowCmsItem({ collectionName: 'Case Studies' }))
        .collectionName,
    ).toBe('Case Studies');
  });
});

// ── READ: mapWebflowToContentStyle (WF1-R-6..10) ─────────────────────────────

describe('FLOW-34 WF1 — READ path: mapWebflowToContentStyle', () => {
  it('WF1-R-6: contentLength always medium (editorial default)', () => {
    expect(mapWebflowToContentStyle(makeWebflowCmsItem()).contentLength).toBe('medium');
  });
  it('WF1-R-7: contentTone always informative (editorial default)', () => {
    expect(mapWebflowToContentStyle(makeWebflowCmsItem()).contentTone).toBe('informative');
  });
  it('WF1-R-8: itemType always CMS_ITEM', () => {
    expect(mapWebflowToContentStyle(makeWebflowCmsItem()).itemType).toBe('CMS_ITEM');
  });
  it('WF1-R-9: style consistent regardless of item status', () => {
    expect(
      mapWebflowToContentStyle(makeWebflowCmsItem({ status: 'published' })).contentLength,
    ).toBe('medium');
    expect(mapWebflowToContentStyle(makeWebflowCmsItem({ status: 'archived' })).contentTone).toBe(
      'informative',
    );
  });
  it('WF1-R-10: style consistent regardless of collection type', () => {
    expect(
      mapWebflowToContentStyle(makeWebflowCmsItem({ collectionName: 'Products' })).contentLength,
    ).toBe('medium');
  });
});

// ── WRITE: mapCmsStyleToWebflow (WF1-W-1..4) ─────────────────────────────────

describe('FLOW-34 WF1 — WRITE path: mapCmsStyleToWebflow', () => {
  it('WF1-W-1: contentLength passes through', () => {
    expect(mapCmsStyleToWebflow({ ...CANONICAL_STYLE, contentLength: 'long' }).contentLength).toBe(
      'long',
    );
  });
  it('WF1-W-2: contentTone passes through', () => {
    expect(
      mapCmsStyleToWebflow({ ...CANONICAL_STYLE, contentTone: 'persuasive' }).contentTone,
    ).toBe('persuasive');
  });
  it('WF1-W-3: itemType not in write payload (internal classifier)', () => {
    const payload = mapCmsStyleToWebflow(CANONICAL_STYLE);
    expect('itemType' in payload).toBe(false);
  });
  it('WF1-W-4: short and casual variants handled', () => {
    const payload = mapCmsStyleToWebflow({
      ...CANONICAL_STYLE,
      contentLength: 'short',
      contentTone: 'casual',
    });
    expect(payload.contentLength).toBe('short');
    expect(payload.contentTone).toBe('casual');
  });
});

// ── WRITE: writeCmsContent (WF1-W-5..8) ──────────────────────────────────────

describe('FLOW-34 WF1 — WRITE path: writeCmsContent', () => {
  it('WF1-W-5: writer called once, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeCmsContent(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedContent: GENERATED_CONTENT }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('WF1-W-6: payload type=CMS_UPDATE, slug, name, status=draft, content, contentLength, contentTone', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeCmsContent(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedContent: GENERATED_CONTENT }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('CMS_UPDATE');
    expect(payload['slug']).toBe('ai-in-design');
    expect(payload['name']).toBe('AI in Design');
    expect(payload['status']).toBe('draft');
    expect(payload['content']).toBe(GENERATED_CONTENT);
    expect(payload['contentLength']).toBe('medium');
    expect(payload['contentTone']).toBe('informative');
  });
  it('WF1-W-7: writer failure → failed incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Webflow API error'));
    const result = await writeCmsContent(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedContent: GENERATED_CONTENT }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('WF1-W-8: writes multiple items in order', async () => {
    const slugs: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      slugs.push(p['slug'] as string);
    });
    await writeCmsContent(
      [
        {
          element: { ...CANONICAL_ELEMENT, slug: 'post-alpha' },
          style: CANONICAL_STYLE,
          generatedContent: 'Content A',
        },
        {
          element: { ...CANONICAL_ELEMENT, slug: 'post-beta' },
          style: CANONICAL_STYLE,
          generatedContent: 'Content B',
        },
      ],
      writer,
    );
    expect(slugs).toEqual(['post-alpha', 'post-beta']);
  });
});

// ── Equivalence (WF1-E-1..4) ─────────────────────────────────────────────────

describe('FLOW-34 WF1 — Equivalence: adapter output = shared canonical', () => {
  const item = makeWebflowCmsItem();
  it('WF1-E-1: mapWebflowToContentElement output identical to canonical element', () => {
    expect(mapWebflowToContentElement(item)).toEqual(CANONICAL_ELEMENT);
  });
  it('WF1-E-2: mapWebflowToContentStyle output identical to canonical style', () => {
    expect(mapWebflowToContentStyle(item)).toEqual(CANONICAL_STYLE);
  });
  it('WF1-E-3: readCmsCollection arrays match canonical shapes', () => {
    const { elements, styles } = readCmsCollection([item]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('WF1-E-4: READ→WRITE round-trip preserves contentLength and contentTone', () => {
    const shared = mapWebflowToContentStyle(item);
    const back = mapCmsStyleToWebflow(shared);
    expect(back.contentLength).toBe(shared.contentLength);
    expect(back.contentTone).toBe(shared.contentTone);
  });
});

// ── Packaging (WF1-P-1..4) ───────────────────────────────────────────────────

describe('FLOW-34 WF1 — Packaging + manifest checks', () => {
  it('WF1-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapWebflowToContentElement).toBe('function');
    expect(typeof mapWebflowToContentStyle).toBe('function');
    expect(typeof mapCmsStyleToWebflow).toBe('function');
    expect(typeof readCmsCollection).toBe('function');
    expect(typeof writeCmsContent).toBe('function');
  });
  it('WF1-P-2: adapter importable without @webflow/designer-extension-typings', () => {
    expect(mapWebflowToContentElement).toBeDefined();
  });
  it('WF1-P-3: package.json name follows @xiigen/webflow-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../.././../adapters/webflow/FT-WF1/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/webflow-/);
  });
  it('WF1-P-4: FT-WF1 record in marketplace manifest', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ftWf1 = manifest.features.find((f) => f.ftId === 'FT-WF1');
    expect(ftWf1).toBeDefined();
    expect(ftWf1!.portingCandidate).toBe(true);
    const webflow = ftWf1!.platforms.find((p) => p.platformId === 'webflow');
    expect(webflow).toBeDefined();
    expect(webflow!.adapterMode).toBe('MODE_B');
    expect(webflow!.adapterPath).toContain('FT-WF1');
  });
});
