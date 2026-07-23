/**
 * FLOW-34 — N-AUTO n8n Auto-Builder Adapter Tests
 * 26 tests: N-AUTO-R-1..10, N-AUTO-W-1..8, N-AUTO-E-1..4, N-AUTO-P-1..4
 */

import {
  mapN8nToWorkflowStep,
  mapN8nToWorkflowStyle,
  mapWorkflowStyleToN8n,
  readWorkflowSpec,
  writeWorkflowConfig,
} from '../../../adapters/n8n/FT-N-AUTO/src/n8n-auto-adapter';
import type {
  N8nNodeSpec,
  SharedWorkflowStep,
  SharedWorkflowStyle,
} from '../../../adapters/n8n/FT-N-AUTO/src/types';

function makeN8nNode(overrides: Partial<N8nNodeSpec> = {}): N8nNodeSpec {
  return {
    id: 'node-001',
    type: 'http_request',
    name: 'Fetch User Data',
    nextNodeIds: ['node-002'],
    ...overrides,
  };
}

const CANONICAL_STEP: SharedWorkflowStep = {
  type: 'ACTION',
  name: 'Fetch User Data',
  nextSteps: ['node-002'],
};
const CANONICAL_STYLE: SharedWorkflowStyle = {
  stepRole: 'ACTION',
  isEntryPoint: false,
  requiresConfig: true,
};
const GENERATED_CONFIG = {
  nodeType: 'n8n-nodes-base.httpRequest',
  parameters: { method: 'GET', url: 'https://api.example.com/users' },
};

// ── READ: mapN8nToWorkflowStep (N-AUTO-R-1..5) ────────────────────────────────

describe('FLOW-34 N-AUTO — READ path: mapN8nToWorkflowStep', () => {
  it('N-AUTO-R-1: http_request → ACTION', () => {
    expect(mapN8nToWorkflowStep(makeN8nNode({ type: 'http_request' })).type).toBe('ACTION');
  });
  it('N-AUTO-R-2: trigger/schedule/webhook→TRIGGER, filter→CONDITION, merge→TRANSFORM', () => {
    expect(mapN8nToWorkflowStep(makeN8nNode({ type: 'trigger', nextNodeIds: ['n2'] })).type).toBe(
      'TRIGGER',
    );
    expect(mapN8nToWorkflowStep(makeN8nNode({ type: 'schedule', nextNodeIds: ['n2'] })).type).toBe(
      'TRIGGER',
    );
    expect(mapN8nToWorkflowStep(makeN8nNode({ type: 'webhook', nextNodeIds: ['n2'] })).type).toBe(
      'TRIGGER',
    );
    expect(mapN8nToWorkflowStep(makeN8nNode({ type: 'filter', nextNodeIds: ['n2'] })).type).toBe(
      'CONDITION',
    );
    expect(mapN8nToWorkflowStep(makeN8nNode({ type: 'merge', nextNodeIds: ['n2'] })).type).toBe(
      'TRANSFORM',
    );
  });
  it('N-AUTO-R-3: name preserved', () => {
    expect(mapN8nToWorkflowStep(makeN8nNode({ name: 'Fetch User Data' })).name).toBe(
      'Fetch User Data',
    );
  });
  it('N-AUTO-R-4: nextNodeIds → nextSteps', () => {
    expect(mapN8nToWorkflowStep(makeN8nNode({ nextNodeIds: ['node-002'] })).nextSteps).toEqual([
      'node-002',
    ]);
  });
  it('N-AUTO-R-5: node with no nextNodeIds → OUTPUT type', () => {
    expect(mapN8nToWorkflowStep(makeN8nNode({ type: 'set', nextNodeIds: [] })).type).toBe('OUTPUT');
    expect(mapN8nToWorkflowStep(makeN8nNode({ type: 'set', nextNodeIds: undefined })).type).toBe(
      'OUTPUT',
    );
  });
});

// ── READ: mapN8nToWorkflowStyle (N-AUTO-R-6..10) ──────────────────────────────

describe('FLOW-34 N-AUTO — READ path: mapN8nToWorkflowStyle', () => {
  it('N-AUTO-R-6: ACTION → isEntryPoint false', () => {
    expect(mapN8nToWorkflowStyle(makeN8nNode({ type: 'http_request' })).isEntryPoint).toBe(false);
  });
  it('N-AUTO-R-7: TRIGGER → isEntryPoint true', () => {
    expect(
      mapN8nToWorkflowStyle(makeN8nNode({ type: 'trigger', nextNodeIds: ['n2'] })).isEntryPoint,
    ).toBe(true);
  });
  it('N-AUTO-R-8: http_request/code/webhook → requiresConfig true', () => {
    expect(mapN8nToWorkflowStyle(makeN8nNode({ type: 'http_request' })).requiresConfig).toBe(true);
    expect(
      mapN8nToWorkflowStyle(makeN8nNode({ type: 'code', nextNodeIds: ['n2'] })).requiresConfig,
    ).toBe(true);
    expect(
      mapN8nToWorkflowStyle(makeN8nNode({ type: 'webhook', nextNodeIds: ['n2'] })).requiresConfig,
    ).toBe(true);
  });
  it('N-AUTO-R-9: filter/merge/set → requiresConfig false', () => {
    expect(
      mapN8nToWorkflowStyle(makeN8nNode({ type: 'filter', nextNodeIds: ['n2'] })).requiresConfig,
    ).toBe(false);
    expect(
      mapN8nToWorkflowStyle(makeN8nNode({ type: 'merge', nextNodeIds: ['n2'] })).requiresConfig,
    ).toBe(false);
    expect(
      mapN8nToWorkflowStyle(makeN8nNode({ type: 'set', nextNodeIds: [] })).requiresConfig,
    ).toBe(false);
  });
  it('N-AUTO-R-10: stepRole matches inferred type', () => {
    expect(mapN8nToWorkflowStyle(makeN8nNode({ type: 'http_request' })).stepRole).toBe('ACTION');
    expect(
      mapN8nToWorkflowStyle(makeN8nNode({ type: 'trigger', nextNodeIds: ['n2'] })).stepRole,
    ).toBe('TRIGGER');
  });
});

// ── WRITE: mapWorkflowStyleToN8n (N-AUTO-W-1..4) ──────────────────────────────

describe('FLOW-34 N-AUTO — WRITE path: mapWorkflowStyleToN8n', () => {
  it('N-AUTO-W-1: ACTION → http_request type in write payload', () => {
    expect(
      mapWorkflowStyleToN8n({ stepRole: 'ACTION', isEntryPoint: false, requiresConfig: true }).type,
    ).toBe('http_request');
  });
  it('N-AUTO-W-2: TRIGGER→trigger, CONDITION→filter, TRANSFORM→merge, OUTPUT→set', () => {
    expect(
      mapWorkflowStyleToN8n({ stepRole: 'TRIGGER', isEntryPoint: true, requiresConfig: false })
        .type,
    ).toBe('trigger');
    expect(
      mapWorkflowStyleToN8n({ stepRole: 'CONDITION', isEntryPoint: false, requiresConfig: false })
        .type,
    ).toBe('filter');
    expect(
      mapWorkflowStyleToN8n({ stepRole: 'TRANSFORM', isEntryPoint: false, requiresConfig: false })
        .type,
    ).toBe('merge');
    expect(
      mapWorkflowStyleToN8n({ stepRole: 'OUTPUT', isEntryPoint: false, requiresConfig: false })
        .type,
    ).toBe('set');
  });
  it('N-AUTO-W-3: writer called once, written=1, failed=0', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeWorkflowConfig(
      [{ step: CANONICAL_STEP, style: CANONICAL_STYLE, generatedConfig: GENERATED_CONFIG }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('N-AUTO-W-4: payload has type=WORKFLOW_NODE, name, stepRole, nodeType, parameters', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeWorkflowConfig(
      [{ step: CANONICAL_STEP, style: CANONICAL_STYLE, generatedConfig: GENERATED_CONFIG }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('WORKFLOW_NODE');
    expect(payload['name']).toBe('Fetch User Data');
    expect(payload['stepRole']).toBe('ACTION');
    expect(payload['nodeType']).toBe('n8n-nodes-base.httpRequest');
    expect(payload['parameters']).toEqual({ method: 'GET', url: 'https://api.example.com/users' });
  });
});

// ── WRITE: writeWorkflowConfig (N-AUTO-W-5..8) ────────────────────────────────

describe('FLOW-34 N-AUTO — WRITE path: writeWorkflowConfig (injected writer)', () => {
  it('N-AUTO-W-5: writer failure → failed=1, no throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('n8n API error'));
    const result = await writeWorkflowConfig(
      [{ step: CANONICAL_STEP, style: CANONICAL_STYLE, generatedConfig: GENERATED_CONFIG }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('N-AUTO-W-6: writes multiple items in order', async () => {
    const names: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      names.push(p['name'] as string);
    });
    await writeWorkflowConfig(
      [
        {
          step: { ...CANONICAL_STEP, name: 'Step A' },
          style: CANONICAL_STYLE,
          generatedConfig: GENERATED_CONFIG,
        },
        {
          step: { ...CANONICAL_STEP, name: 'Step B' },
          style: CANONICAL_STYLE,
          generatedConfig: GENERATED_CONFIG,
        },
      ],
      writer,
    );
    expect(names).toEqual(['Step A', 'Step B']);
  });
  it('N-AUTO-W-7: mapWorkflowStyleToN8n OUTPUT → set', () => {
    expect(
      mapWorkflowStyleToN8n({ stepRole: 'OUTPUT', isEntryPoint: false, requiresConfig: false })
        .type,
    ).toBe('set');
  });
  it('N-AUTO-W-8: mapWorkflowStyleToN8n TRIGGER → trigger', () => {
    expect(
      mapWorkflowStyleToN8n({ stepRole: 'TRIGGER', isEntryPoint: true, requiresConfig: false })
        .type,
    ).toBe('trigger');
  });
});

// ── Equivalence (N-AUTO-E-1..4) ───────────────────────────────────────────────

describe('FLOW-34 N-AUTO — Equivalence: adapter output = shared canonical', () => {
  const node = makeN8nNode();
  it('N-AUTO-E-1: mapN8nToWorkflowStep output identical to CANONICAL_STEP', () => {
    expect(mapN8nToWorkflowStep(node)).toEqual(CANONICAL_STEP);
  });
  it('N-AUTO-E-2: mapN8nToWorkflowStyle output identical to CANONICAL_STYLE', () => {
    expect(mapN8nToWorkflowStyle(node)).toEqual(CANONICAL_STYLE);
  });
  it('N-AUTO-E-3: readWorkflowSpec steps[0]=CANONICAL_STEP, styles[0]=CANONICAL_STYLE', () => {
    const { steps, styles } = readWorkflowSpec([node]);
    expect(steps[0]).toEqual(CANONICAL_STEP);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('N-AUTO-E-4: READ→WRITE round-trip: ACTION → http_request', () => {
    const style = mapN8nToWorkflowStyle(node);
    const back = mapWorkflowStyleToN8n(style);
    expect(back.type).toBe('http_request');
  });
});

// ── Packaging (N-AUTO-P-1..4) ─────────────────────────────────────────────────

describe('FLOW-34 N-AUTO — Packaging + manifest checks', () => {
  it('N-AUTO-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapN8nToWorkflowStep).toBe('function');
    expect(typeof mapN8nToWorkflowStyle).toBe('function');
    expect(typeof mapWorkflowStyleToN8n).toBe('function');
    expect(typeof readWorkflowSpec).toBe('function');
    expect(typeof writeWorkflowConfig).toBe('function');
  });
  it('N-AUTO-P-2: adapter importable without n8n SDK', () => {
    expect(mapN8nToWorkflowStep).toBeDefined();
  });
  it('N-AUTO-P-3: package.json name matches /^@xiigen\\/n8n-/', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/n8n/FT-N-AUTO/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/n8n-/);
  });
  it('N-AUTO-P-4: FT-N-AUTO in manifest, n8n platform, MODE_B, path contains FT-N-AUTO', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ft = manifest.features.find((f) => f.ftId === 'FT-N-AUTO');
    expect(ft).toBeDefined();
    expect(ft!.portingCandidate).toBe(true);
    const platform = ft!.platforms.find((p) => p.platformId === 'n8n');
    expect(platform).toBeDefined();
    expect(platform!.adapterMode).toBe('MODE_B');
    expect(platform!.adapterPath).toContain('FT-N-AUTO');
  });
});
