/**
 * FLOW-34 — WF-FLOW Webflow Flow Router Adapter Tests
 * 26 tests: WF-FLOW-R-1..10, WF-FLOW-W-1..8, WF-FLOW-E-1..4, WF-FLOW-P-1..4
 */

import {
  mapWebflowToFlowNode,
  mapWebflowToFlowStyle,
  mapFlowStyleToWebflow,
  readPageHierarchy,
  writeFlowSpec,
} from '../../../adapters/webflow/FT-WF-FLOW/src/webflow-flow-adapter';
import type {
  WebflowPageNode,
  SharedFlowNode,
  SharedFlowStyle,
} from '../../../adapters/webflow/FT-WF-FLOW/src/types';

function makeWebflowPage(overrides: Partial<WebflowPageNode> = {}): WebflowPageNode {
  return {
    id: 'page-001',
    slug: '/features',
    name: 'Features',
    type: 'static',
    childCount: 0,
    ...overrides,
  };
}

const CANONICAL_NODE: SharedFlowNode = {
  type: 'STEP',
  label: 'Features',
  slug: '/features',
  fromId: undefined,
};
const CANONICAL_STYLE: SharedFlowStyle = {
  nodeRole: 'STEP',
  isTerminal: false,
  hasCondition: false,
};
const FLOW_SPEC = { description: 'Features section', systemComponent: 'ContentService' };

// ── READ: mapWebflowToFlowNode (WF-FLOW-R-1..5) ───────────────────────────────

describe('FLOW-34 WF-FLOW — READ path: mapWebflowToFlowNode', () => {
  it('WF-FLOW-R-1: static page → STEP', () => {
    expect(mapWebflowToFlowNode(makeWebflowPage({ type: 'static' })).type).toBe('STEP');
  });
  it('WF-FLOW-R-2: slug="/"→START, utility→END, collection→DECISION', () => {
    expect(mapWebflowToFlowNode(makeWebflowPage({ slug: '/', name: 'Home' })).type).toBe('START');
    expect(mapWebflowToFlowNode(makeWebflowPage({ type: 'utility', slug: '/404' })).type).toBe(
      'END',
    );
    expect(mapWebflowToFlowNode(makeWebflowPage({ type: 'collection', slug: '/blog' })).type).toBe(
      'DECISION',
    );
  });
  it('WF-FLOW-R-3: name → label', () => {
    expect(mapWebflowToFlowNode(makeWebflowPage({ name: 'Features' })).label).toBe('Features');
  });
  it('WF-FLOW-R-4: slug preserved', () => {
    expect(mapWebflowToFlowNode(makeWebflowPage({ slug: '/features' })).slug).toBe('/features');
  });
  it('WF-FLOW-R-5: parentId → fromId', () => {
    expect(mapWebflowToFlowNode(makeWebflowPage({ parentId: 'page-000' })).fromId).toBe('page-000');
  });
});

// ── READ: mapWebflowToFlowStyle (WF-FLOW-R-6..10) ─────────────────────────────

describe('FLOW-34 WF-FLOW — READ path: mapWebflowToFlowStyle', () => {
  it('WF-FLOW-R-6: STEP → isTerminal false', () => {
    expect(mapWebflowToFlowStyle(makeWebflowPage({ type: 'static' })).isTerminal).toBe(false);
  });
  it('WF-FLOW-R-7: START and END → isTerminal true', () => {
    expect(mapWebflowToFlowStyle(makeWebflowPage({ slug: '/', name: 'Home' })).isTerminal).toBe(
      true,
    );
    expect(
      mapWebflowToFlowStyle(makeWebflowPage({ type: 'utility', slug: '/404' })).isTerminal,
    ).toBe(true);
  });
  it('WF-FLOW-R-8: DECISION → hasCondition true', () => {
    expect(
      mapWebflowToFlowStyle(makeWebflowPage({ type: 'collection', slug: '/blog' })).hasCondition,
    ).toBe(true);
  });
  it('WF-FLOW-R-9: STEP → nodeRole STEP', () => {
    expect(mapWebflowToFlowStyle(makeWebflowPage({ type: 'static' })).nodeRole).toBe('STEP');
  });
  it('WF-FLOW-R-10: collection → nodeRole DECISION', () => {
    expect(
      mapWebflowToFlowStyle(makeWebflowPage({ type: 'collection', slug: '/blog' })).nodeRole,
    ).toBe('DECISION');
  });
});

// ── WRITE: mapFlowStyleToWebflow (WF-FLOW-W-1..4) ────────────────────────────

describe('FLOW-34 WF-FLOW — WRITE path: mapFlowStyleToWebflow', () => {
  it('WF-FLOW-W-1: STEP → static type', () => {
    expect(
      mapFlowStyleToWebflow({ nodeRole: 'STEP', isTerminal: false, hasCondition: false }).type,
    ).toBe('static');
  });
  it('WF-FLOW-W-2: DECISION→collection, END→utility, START→static', () => {
    expect(
      mapFlowStyleToWebflow({ nodeRole: 'DECISION', isTerminal: false, hasCondition: true }).type,
    ).toBe('collection');
    expect(
      mapFlowStyleToWebflow({ nodeRole: 'END', isTerminal: true, hasCondition: false }).type,
    ).toBe('utility');
    expect(
      mapFlowStyleToWebflow({ nodeRole: 'START', isTerminal: true, hasCondition: false }).type,
    ).toBe('static');
  });
  it('WF-FLOW-W-3: writer called once, written=1, failed=0', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeFlowSpec(
      [{ node: CANONICAL_NODE, style: CANONICAL_STYLE, generatedSpec: FLOW_SPEC }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('WF-FLOW-W-4: payload has type=FLOW_SPEC, label, nodeRole, systemComponent, description', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeFlowSpec(
      [{ node: CANONICAL_NODE, style: CANONICAL_STYLE, generatedSpec: FLOW_SPEC }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('FLOW_SPEC');
    expect(payload['label']).toBe('Features');
    expect(payload['nodeRole']).toBe('STEP');
    expect(payload['systemComponent']).toBe('ContentService');
    expect(payload['description']).toBe('Features section');
  });
});

// ── WRITE: writeFlowSpec (WF-FLOW-W-5..8) ─────────────────────────────────────

describe('FLOW-34 WF-FLOW — WRITE path: writeFlowSpec (injected writer)', () => {
  it('WF-FLOW-W-5: writer failure → failed=1, no throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Webflow API error'));
    const result = await writeFlowSpec(
      [{ node: CANONICAL_NODE, style: CANONICAL_STYLE, generatedSpec: FLOW_SPEC }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('WF-FLOW-W-6: writes multiple items in order', async () => {
    const labels: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      labels.push(p['label'] as string);
    });
    await writeFlowSpec(
      [
        {
          node: { ...CANONICAL_NODE, label: 'Page A' },
          style: CANONICAL_STYLE,
          generatedSpec: FLOW_SPEC,
        },
        {
          node: { ...CANONICAL_NODE, label: 'Page B' },
          style: CANONICAL_STYLE,
          generatedSpec: FLOW_SPEC,
        },
      ],
      writer,
    );
    expect(labels).toEqual(['Page A', 'Page B']);
  });
  it('WF-FLOW-W-7: readPageHierarchy arrays match canonical', () => {
    const { nodes, styles } = readPageHierarchy([makeWebflowPage()]);
    expect(nodes[0]).toEqual(CANONICAL_NODE);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('WF-FLOW-W-8: round-trip STEP → static type', () => {
    const style = mapWebflowToFlowStyle(makeWebflowPage({ type: 'static' }));
    const back = mapFlowStyleToWebflow(style);
    expect(back.type).toBe('static');
  });
});

// ── Equivalence (WF-FLOW-E-1..4) ──────────────────────────────────────────────

describe('FLOW-34 WF-FLOW — Equivalence: adapter output = shared canonical', () => {
  const page = makeWebflowPage();
  it('WF-FLOW-E-1: mapWebflowToFlowNode output identical to CANONICAL_NODE', () => {
    expect(mapWebflowToFlowNode(page)).toEqual(CANONICAL_NODE);
  });
  it('WF-FLOW-E-2: mapWebflowToFlowStyle output identical to CANONICAL_STYLE', () => {
    expect(mapWebflowToFlowStyle(page)).toEqual(CANONICAL_STYLE);
  });
  it('WF-FLOW-E-3: readPageHierarchy nodes[0]=CANONICAL_NODE, styles[0]=CANONICAL_STYLE', () => {
    const { nodes, styles } = readPageHierarchy([page]);
    expect(nodes[0]).toEqual(CANONICAL_NODE);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('WF-FLOW-E-4: READ→WRITE round-trip: STEP → static type', () => {
    const style = mapWebflowToFlowStyle(page);
    const back = mapFlowStyleToWebflow(style);
    expect(back.type).toBe('static');
  });
});

// ── Packaging (WF-FLOW-P-1..4) ────────────────────────────────────────────────

describe('FLOW-34 WF-FLOW — Packaging + manifest checks', () => {
  it('WF-FLOW-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapWebflowToFlowNode).toBe('function');
    expect(typeof mapWebflowToFlowStyle).toBe('function');
    expect(typeof mapFlowStyleToWebflow).toBe('function');
    expect(typeof readPageHierarchy).toBe('function');
    expect(typeof writeFlowSpec).toBe('function');
  });
  it('WF-FLOW-P-2: adapter importable without Webflow SDK', () => {
    expect(mapWebflowToFlowNode).toBeDefined();
  });
  it('WF-FLOW-P-3: package.json name matches /^@xiigen\\/webflow-/', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/webflow/FT-WF-FLOW/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/webflow-/);
  });
  it('WF-FLOW-P-4: FT-WF-FLOW in manifest, webflow platform, MODE_B, path contains FT-WF-FLOW', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ft = manifest.features.find((f) => f.ftId === 'FT-WF-FLOW');
    expect(ft).toBeDefined();
    expect(ft!.portingCandidate).toBe(true);
    const platform = ft!.platforms.find((p) => p.platformId === 'webflow');
    expect(platform).toBeDefined();
    expect(platform!.adapterMode).toBe('MODE_B');
    expect(platform!.adapterPath).toContain('FT-WF-FLOW');
  });
});
