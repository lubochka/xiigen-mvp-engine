/**
 * FLOW-34 — F-FLOW Figma Flow Router Adapter Tests
 * 26 tests: F-FLOW-R-1..10, F-FLOW-W-1..8, F-FLOW-E-1..4, F-FLOW-P-1..4
 */

import {
  mapFigmaToFlowNode,
  mapFigmaToFlowStyle,
  mapFlowStyleToFigma,
  readFlowDiagram,
  writeFlowSpec,
} from '../../../adapters/figma/FT-F-FLOW/src/figma-flow-adapter';
import type {
  FigmaFlowNode,
  SharedFlowNode,
  SharedFlowStyle,
} from '../../../adapters/figma/FT-F-FLOW/src/types';

function makeFigmaNode(overrides: Partial<FigmaFlowNode> = {}): FigmaFlowNode {
  return {
    id: 'node-001',
    type: 'RECTANGLE',
    name: 'Process Payment',
    connections: undefined,
    width: 200,
    height: 80,
    ...overrides,
  };
}

const CANONICAL_NODE: SharedFlowNode = {
  type: 'STEP',
  label: 'Process Payment',
  fromId: undefined,
  toId: undefined,
};
const CANONICAL_STYLE: SharedFlowStyle = {
  nodeRole: 'STEP',
  isTerminal: false,
  hasCondition: false,
};
const FLOW_SPEC = { description: 'Handles payment processing', systemComponent: 'PaymentService' };

// ── READ: mapFigmaToFlowNode (F-FLOW-R-1..5) ──────────────────────────────────

describe('FLOW-34 F-FLOW — READ path: mapFigmaToFlowNode', () => {
  it('F-FLOW-R-1: RECTANGLE → STEP', () => {
    expect(mapFigmaToFlowNode(makeFigmaNode({ type: 'RECTANGLE' })).type).toBe('STEP');
  });
  it('F-FLOW-R-2: ELLIPSE+Start→START, ELLIPSE(no Start)→END, CONNECTOR→CONNECTOR, POLYGON→DECISION', () => {
    expect(mapFigmaToFlowNode(makeFigmaNode({ type: 'ELLIPSE', name: 'Start' })).type).toBe(
      'START',
    );
    expect(mapFigmaToFlowNode(makeFigmaNode({ type: 'ELLIPSE', name: 'Finish' })).type).toBe('END');
    expect(mapFigmaToFlowNode(makeFigmaNode({ type: 'CONNECTOR', name: 'Arrow' })).type).toBe(
      'CONNECTOR',
    );
    expect(mapFigmaToFlowNode(makeFigmaNode({ type: 'POLYGON', name: 'Choice' })).type).toBe(
      'DECISION',
    );
  });
  it('F-FLOW-R-3: name preserved as label', () => {
    expect(mapFigmaToFlowNode(makeFigmaNode({ name: 'Process Payment' })).label).toBe(
      'Process Payment',
    );
  });
  it('F-FLOW-R-4: connections.fromId preserved', () => {
    expect(mapFigmaToFlowNode(makeFigmaNode({ connections: { fromId: 'node-000' } })).fromId).toBe(
      'node-000',
    );
  });
  it('F-FLOW-R-5: connections.toId preserved', () => {
    expect(mapFigmaToFlowNode(makeFigmaNode({ connections: { toId: 'node-002' } })).toId).toBe(
      'node-002',
    );
  });
});

// ── READ: mapFigmaToFlowStyle (F-FLOW-R-6..10) ────────────────────────────────

describe('FLOW-34 F-FLOW — READ path: mapFigmaToFlowStyle', () => {
  it('F-FLOW-R-6: STEP → isTerminal false', () => {
    expect(mapFigmaToFlowStyle(makeFigmaNode({ type: 'RECTANGLE' })).isTerminal).toBe(false);
  });
  it('F-FLOW-R-7: START and END → isTerminal true', () => {
    expect(mapFigmaToFlowStyle(makeFigmaNode({ type: 'ELLIPSE', name: 'Start' })).isTerminal).toBe(
      true,
    );
    expect(mapFigmaToFlowStyle(makeFigmaNode({ type: 'ELLIPSE', name: 'End' })).isTerminal).toBe(
      true,
    );
  });
  it('F-FLOW-R-8: DECISION → hasCondition true', () => {
    expect(
      mapFigmaToFlowStyle(makeFigmaNode({ type: 'POLYGON', name: 'Choice' })).hasCondition,
    ).toBe(true);
  });
  it('F-FLOW-R-9: CONNECTOR → nodeRole CONNECTOR, isTerminal false', () => {
    const style = mapFigmaToFlowStyle(makeFigmaNode({ type: 'CONNECTOR', name: 'Arrow' }));
    expect(style.nodeRole).toBe('CONNECTOR');
    expect(style.isTerminal).toBe(false);
  });
  it('F-FLOW-R-10: name ending "?" → DECISION', () => {
    expect(
      mapFigmaToFlowStyle(makeFigmaNode({ type: 'RECTANGLE', name: 'Is valid?' })).nodeRole,
    ).toBe('DECISION');
  });
});

// ── WRITE: mapFlowStyleToFigma (F-FLOW-W-1..4) ────────────────────────────────

describe('FLOW-34 F-FLOW — WRITE path: mapFlowStyleToFigma', () => {
  it('F-FLOW-W-1: STEP → RECTANGLE type in write payload', () => {
    expect(
      mapFlowStyleToFigma({ nodeRole: 'STEP', isTerminal: false, hasCondition: false }).type,
    ).toBe('RECTANGLE');
  });
  it('F-FLOW-W-2: DECISION→POLYGON, START/END→ELLIPSE, CONNECTOR→CONNECTOR', () => {
    expect(
      mapFlowStyleToFigma({ nodeRole: 'DECISION', isTerminal: false, hasCondition: true }).type,
    ).toBe('POLYGON');
    expect(
      mapFlowStyleToFigma({ nodeRole: 'START', isTerminal: true, hasCondition: false }).type,
    ).toBe('ELLIPSE');
    expect(
      mapFlowStyleToFigma({ nodeRole: 'END', isTerminal: true, hasCondition: false }).type,
    ).toBe('ELLIPSE');
    expect(
      mapFlowStyleToFigma({ nodeRole: 'CONNECTOR', isTerminal: false, hasCondition: false }).type,
    ).toBe('CONNECTOR');
  });
  it('F-FLOW-W-3: writer called once, written=1, failed=0', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeFlowSpec(
      [{ node: CANONICAL_NODE, style: CANONICAL_STYLE, generatedSpec: FLOW_SPEC }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('F-FLOW-W-4: payload has type=FLOW_SPEC, label, nodeRole, systemComponent, description', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeFlowSpec(
      [{ node: CANONICAL_NODE, style: CANONICAL_STYLE, generatedSpec: FLOW_SPEC }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('FLOW_SPEC');
    expect(payload['label']).toBe('Process Payment');
    expect(payload['nodeRole']).toBe('STEP');
    expect(payload['systemComponent']).toBe('PaymentService');
    expect(payload['description']).toBe('Handles payment processing');
  });
});

// ── WRITE: writeFlowSpec (F-FLOW-W-5..8) ──────────────────────────────────────

describe('FLOW-34 F-FLOW — WRITE path: writeFlowSpec (injected writer)', () => {
  it('F-FLOW-W-5: writer failure → failed=1, no throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Figma API error'));
    const result = await writeFlowSpec(
      [{ node: CANONICAL_NODE, style: CANONICAL_STYLE, generatedSpec: FLOW_SPEC }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('F-FLOW-W-6: writes multiple items in order', async () => {
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
  it('F-FLOW-W-7: readFlowDiagram arrays match canonical', () => {
    const { nodes, styles } = readFlowDiagram([makeFigmaNode()]);
    expect(nodes[0]).toEqual(CANONICAL_NODE);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('F-FLOW-W-8: round-trip RECTANGLE → STEP → RECTANGLE type', () => {
    const node = makeFigmaNode({ type: 'RECTANGLE' });
    const style = mapFigmaToFlowStyle(node);
    const back = mapFlowStyleToFigma(style);
    expect(back.type).toBe('RECTANGLE');
  });
});

// ── Equivalence (F-FLOW-E-1..4) ───────────────────────────────────────────────

describe('FLOW-34 F-FLOW — Equivalence: adapter output = shared canonical', () => {
  const node = makeFigmaNode();
  it('F-FLOW-E-1: mapFigmaToFlowNode output identical to CANONICAL_NODE', () => {
    expect(mapFigmaToFlowNode(node)).toEqual(CANONICAL_NODE);
  });
  it('F-FLOW-E-2: mapFigmaToFlowStyle output identical to CANONICAL_STYLE', () => {
    expect(mapFigmaToFlowStyle(node)).toEqual(CANONICAL_STYLE);
  });
  it('F-FLOW-E-3: readFlowDiagram nodes[0] = CANONICAL_NODE, styles[0] = CANONICAL_STYLE', () => {
    const { nodes, styles } = readFlowDiagram([node]);
    expect(nodes[0]).toEqual(CANONICAL_NODE);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('F-FLOW-E-4: READ→WRITE round-trip: STEP → RECTANGLE type', () => {
    const style = mapFigmaToFlowStyle(node);
    const back = mapFlowStyleToFigma(style);
    expect(back.type).toBe('RECTANGLE');
  });
});

// ── Packaging (F-FLOW-P-1..4) ─────────────────────────────────────────────────

describe('FLOW-34 F-FLOW — Packaging + manifest checks', () => {
  it('F-FLOW-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapFigmaToFlowNode).toBe('function');
    expect(typeof mapFigmaToFlowStyle).toBe('function');
    expect(typeof mapFlowStyleToFigma).toBe('function');
    expect(typeof readFlowDiagram).toBe('function');
    expect(typeof writeFlowSpec).toBe('function');
  });
  it('F-FLOW-P-2: adapter importable without Figma Plugin API', () => {
    expect(mapFigmaToFlowNode).toBeDefined();
  });
  it('F-FLOW-P-3: package.json name matches /^@xiigen\\/figma-/', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/figma/FT-F-FLOW/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/figma-/);
  });
  it('F-FLOW-P-4: FT-F-FLOW in manifest, figma platform, MODE_B, path contains FT-F-FLOW', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ft = manifest.features.find((f) => f.ftId === 'FT-F-FLOW');
    expect(ft).toBeDefined();
    expect(ft!.portingCandidate).toBe(true);
    const platform = ft!.platforms.find((p) => p.platformId === 'figma');
    expect(platform).toBeDefined();
    expect(platform!.adapterMode).toBe('MODE_B');
    expect(platform!.adapterPath).toContain('FT-F-FLOW');
  });
});
