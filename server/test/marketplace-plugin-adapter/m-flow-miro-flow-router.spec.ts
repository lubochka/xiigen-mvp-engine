/**
 * FLOW-34 — M-FLOW Miro Flow Router Adapter Tests
 * 26 tests: M-FLOW-R-1..10, M-FLOW-W-1..8, M-FLOW-E-1..4, M-FLOW-P-1..4
 */

import {
  mapMiroToFlowNode,
  mapMiroToFlowStyle,
  mapFlowStyleToMiro,
  readFlowDiagram,
  writeFlowSpec,
} from '../../../adapters/miro/FT-M-FLOW/src/miro-flow-adapter';
import type {
  MiroFlowItem,
  SharedFlowNode,
  SharedFlowStyle,
} from '../../../adapters/miro/FT-M-FLOW/src/types';

function makeMiroItem(overrides: Partial<MiroFlowItem> = {}): MiroFlowItem {
  return { id: 'item-001', type: 'card', content: 'Authenticate User', ...overrides };
}

const CANONICAL_NODE: SharedFlowNode = {
  type: 'STEP',
  label: 'Authenticate User',
  fromId: undefined,
  toId: undefined,
};
const CANONICAL_STYLE: SharedFlowStyle = {
  nodeRole: 'STEP',
  isTerminal: false,
  hasCondition: false,
};
const FLOW_SPEC = { description: 'Auth step', systemComponent: 'AuthService' };

// ── READ: mapMiroToFlowNode (M-FLOW-R-1..5) ───────────────────────────────────

describe('FLOW-34 M-FLOW — READ path: mapMiroToFlowNode', () => {
  it('M-FLOW-R-1: card → STEP', () => {
    expect(mapMiroToFlowNode(makeMiroItem({ type: 'card' })).type).toBe('STEP');
  });
  it('M-FLOW-R-2: connector→CONNECTOR, shape+diamond→DECISION, shape+circle+Start→START, shape+circle→END', () => {
    expect(mapMiroToFlowNode(makeMiroItem({ type: 'connector' })).type).toBe('CONNECTOR');
    expect(mapMiroToFlowNode(makeMiroItem({ type: 'shape', shape: 'diamond' })).type).toBe(
      'DECISION',
    );
    expect(
      mapMiroToFlowNode(makeMiroItem({ type: 'shape', shape: 'circle', content: 'Start' })).type,
    ).toBe('START');
    expect(
      mapMiroToFlowNode(makeMiroItem({ type: 'shape', shape: 'circle', content: 'End' })).type,
    ).toBe('END');
  });
  it('M-FLOW-R-3: content preserved as label', () => {
    expect(mapMiroToFlowNode(makeMiroItem({ content: 'Authenticate User' })).label).toBe(
      'Authenticate User',
    );
  });
  it('M-FLOW-R-4: startItem.id → fromId', () => {
    expect(mapMiroToFlowNode(makeMiroItem({ startItem: { id: 'item-000' } })).fromId).toBe(
      'item-000',
    );
  });
  it('M-FLOW-R-5: endItem.id → toId', () => {
    expect(mapMiroToFlowNode(makeMiroItem({ endItem: { id: 'item-002' } })).toId).toBe('item-002');
  });
});

// ── READ: mapMiroToFlowStyle (M-FLOW-R-6..10) ─────────────────────────────────

describe('FLOW-34 M-FLOW — READ path: mapMiroToFlowStyle', () => {
  it('M-FLOW-R-6: STEP → isTerminal false', () => {
    expect(mapMiroToFlowStyle(makeMiroItem({ type: 'card' })).isTerminal).toBe(false);
  });
  it('M-FLOW-R-7: START and END → isTerminal true', () => {
    expect(
      mapMiroToFlowStyle(makeMiroItem({ type: 'shape', shape: 'circle', content: 'Start' }))
        .isTerminal,
    ).toBe(true);
    expect(
      mapMiroToFlowStyle(makeMiroItem({ type: 'shape', shape: 'circle', content: 'End' }))
        .isTerminal,
    ).toBe(true);
  });
  it('M-FLOW-R-8: DECISION → hasCondition true', () => {
    expect(mapMiroToFlowStyle(makeMiroItem({ type: 'shape', shape: 'diamond' })).hasCondition).toBe(
      true,
    );
  });
  it('M-FLOW-R-9: CONNECTOR → nodeRole CONNECTOR', () => {
    expect(mapMiroToFlowStyle(makeMiroItem({ type: 'connector' })).nodeRole).toBe('CONNECTOR');
  });
  it('M-FLOW-R-10: sticky_note → STEP', () => {
    expect(mapMiroToFlowStyle(makeMiroItem({ type: 'sticky_note' })).nodeRole).toBe('STEP');
  });
});

// ── WRITE: mapFlowStyleToMiro (M-FLOW-W-1..4) ─────────────────────────────────

describe('FLOW-34 M-FLOW — WRITE path: mapFlowStyleToMiro', () => {
  it('M-FLOW-W-1: STEP → shape type with rectangle shape', () => {
    const out = mapFlowStyleToMiro({ nodeRole: 'STEP', isTerminal: false, hasCondition: false });
    expect(out.type).toBe('shape');
    expect(out.shape).toBe('rectangle');
  });
  it('M-FLOW-W-2: DECISION→shape+diamond, START/END→shape+circle, CONNECTOR→connector type', () => {
    expect(
      mapFlowStyleToMiro({ nodeRole: 'DECISION', isTerminal: false, hasCondition: true }).shape,
    ).toBe('diamond');
    expect(
      mapFlowStyleToMiro({ nodeRole: 'START', isTerminal: true, hasCondition: false }).shape,
    ).toBe('circle');
    expect(
      mapFlowStyleToMiro({ nodeRole: 'END', isTerminal: true, hasCondition: false }).shape,
    ).toBe('circle');
    expect(
      mapFlowStyleToMiro({ nodeRole: 'CONNECTOR', isTerminal: false, hasCondition: false }).type,
    ).toBe('connector');
  });
  it('M-FLOW-W-3: writer called once, written=1, failed=0', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeFlowSpec(
      [{ node: CANONICAL_NODE, style: CANONICAL_STYLE, generatedSpec: FLOW_SPEC }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('M-FLOW-W-4: payload has type=FLOW_SPEC, label, nodeRole, systemComponent', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeFlowSpec(
      [{ node: CANONICAL_NODE, style: CANONICAL_STYLE, generatedSpec: FLOW_SPEC }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('FLOW_SPEC');
    expect(payload['label']).toBe('Authenticate User');
    expect(payload['nodeRole']).toBe('STEP');
    expect(payload['systemComponent']).toBe('AuthService');
  });
});

// ── WRITE: writeFlowSpec (M-FLOW-W-5..8) ──────────────────────────────────────

describe('FLOW-34 M-FLOW — WRITE path: writeFlowSpec (injected writer)', () => {
  it('M-FLOW-W-5: writer failure → failed=1, no throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Miro API error'));
    const result = await writeFlowSpec(
      [{ node: CANONICAL_NODE, style: CANONICAL_STYLE, generatedSpec: FLOW_SPEC }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('M-FLOW-W-6: writes multiple items in order', async () => {
    const labels: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      labels.push(p['label'] as string);
    });
    await writeFlowSpec(
      [
        {
          node: { ...CANONICAL_NODE, label: 'Step A' },
          style: CANONICAL_STYLE,
          generatedSpec: FLOW_SPEC,
        },
        {
          node: { ...CANONICAL_NODE, label: 'Step B' },
          style: CANONICAL_STYLE,
          generatedSpec: FLOW_SPEC,
        },
      ],
      writer,
    );
    expect(labels).toEqual(['Step A', 'Step B']);
  });
  it('M-FLOW-W-7: mapFlowStyleToMiro CONNECTOR → type connector', () => {
    const out = mapFlowStyleToMiro({
      nodeRole: 'CONNECTOR',
      isTerminal: false,
      hasCondition: false,
    });
    expect(out.type).toBe('connector');
  });
  it('M-FLOW-W-8: mapFlowStyleToMiro START → type shape, shape circle', () => {
    const out = mapFlowStyleToMiro({ nodeRole: 'START', isTerminal: true, hasCondition: false });
    expect(out.type).toBe('shape');
    expect(out.shape).toBe('circle');
  });
});

// ── Equivalence (M-FLOW-E-1..4) ───────────────────────────────────────────────

describe('FLOW-34 M-FLOW — Equivalence: adapter output = shared canonical', () => {
  const item = makeMiroItem();
  it('M-FLOW-E-1: mapMiroToFlowNode output identical to CANONICAL_NODE', () => {
    expect(mapMiroToFlowNode(item)).toEqual(CANONICAL_NODE);
  });
  it('M-FLOW-E-2: mapMiroToFlowStyle output identical to CANONICAL_STYLE', () => {
    expect(mapMiroToFlowStyle(item)).toEqual(CANONICAL_STYLE);
  });
  it('M-FLOW-E-3: readFlowDiagram nodes[0]=CANONICAL_NODE, styles[0]=CANONICAL_STYLE', () => {
    const { nodes, styles } = readFlowDiagram([item]);
    expect(nodes[0]).toEqual(CANONICAL_NODE);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('M-FLOW-E-4: READ→WRITE round-trip: STEP → shape type', () => {
    const style = mapMiroToFlowStyle(item);
    const back = mapFlowStyleToMiro(style);
    expect(back.type).toBe('shape');
  });
});

// ── Packaging (M-FLOW-P-1..4) ─────────────────────────────────────────────────

describe('FLOW-34 M-FLOW — Packaging + manifest checks', () => {
  it('M-FLOW-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapMiroToFlowNode).toBe('function');
    expect(typeof mapMiroToFlowStyle).toBe('function');
    expect(typeof mapFlowStyleToMiro).toBe('function');
    expect(typeof readFlowDiagram).toBe('function');
    expect(typeof writeFlowSpec).toBe('function');
  });
  it('M-FLOW-P-2: adapter importable without Miro SDK', () => {
    expect(mapMiroToFlowNode).toBeDefined();
  });
  it('M-FLOW-P-3: package.json name matches /^@xiigen\\/miro-/', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/miro/FT-M-FLOW/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/miro-/);
  });
  it('M-FLOW-P-4: FT-M-FLOW in manifest, miro platform, MODE_B, path contains FT-M-FLOW', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ft = manifest.features.find((f) => f.ftId === 'FT-M-FLOW');
    expect(ft).toBeDefined();
    expect(ft!.portingCandidate).toBe(true);
    const platform = ft!.platforms.find((p) => p.platformId === 'miro');
    expect(platform).toBeDefined();
    expect(platform!.adapterMode).toBe('MODE_B');
    expect(platform!.adapterPath).toContain('FT-M-FLOW');
  });
});
