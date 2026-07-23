/**
 * TopologyViewer RTL tests — Phase 3.
 *
 * Uses real fixture schema from phase-capability-gate.topology.json:
 *   nodes: { id, name, type (VALIDATION|ANALYSIS|GOVERNANCE|EMIT), description }
 *   edges: { from, to, condition?, type? (terminal|terminal-success) }
 *
 * 4 tests:
 *   1. renders nodes from topology contract
 *   2. shows SUSPENDED badge on suspended node when runId provided
 *   3. SuspensionCard shows gap questions and resume button
 *   4. score spread chart renders for Cycle 2 traces
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TopologyViewer } from '../TopologyViewer';

// ── ReactFlow mock (jsdom has no layout engine) ───────────────────────────────
// Renders nodes via the provided nodeTypes so topology-node testids appear in DOM.

jest.mock('reactflow', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    __esModule: true,
    default: ({
      nodes,
      nodeTypes,
    }: {
      nodes?: Array<{ id: string; type?: string; data: unknown }>;
      nodeTypes?: Record<string, React.ComponentType<{ data: unknown }>>;
    }) => {
      const rendered = (nodes ?? []).map((n) => {
        const Comp = nodeTypes?.[n.type ?? ''];
        return Comp
          ? React.createElement(Comp, { key: n.id, data: n.data })
          : React.createElement('div', { key: n.id, 'data-testid': 'topology-node-fallback' });
      });
      return React.createElement('div', { 'data-testid': 'reactflow-mock' }, ...rendered);
    },
    Background: () => null,
    Controls: () => null,
    MarkerType: { ArrowClosed: 'arrowclosed' },
    useNodesState: (init: unknown[]) => {
      const [nodes, setNodes] = React.useState(init);
      return [nodes, setNodes, () => {}];
    },
    useEdgesState: (init: unknown[]) => {
      const [edges, setEdges] = React.useState(init);
      return [edges, setEdges, () => {}];
    },
  };
});

// ── fetch mock ────────────────────────────────────────────────────────────────

global.fetch = jest.fn();

function mockFetchOnce(data: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

function mockEmptyTopologyResponseOnce() {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    },
  });
}

beforeEach(() => {
  (global.fetch as jest.Mock).mockReset();
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TOPOLOGY = {
  flowId: 'FLOW-37',
  topologyId: 'phase-capability-gate',
  version: '1.0',
  description: 'Phase A topology contract',
  nodes: [
    {
      id: 'FlowActiveGuard',
      name: 'FlowActiveGuard',
      type: 'VALIDATION',
      description: 'Verifies FLOW-36 is ACTIVE',
    },
    {
      id: 'PhaseRecordReader',
      name: 'PhaseRecordReader',
      type: 'ANALYSIS',
      description: 'Reads phase requirement documents',
    },
    {
      id: 'FeatureRecordReader',
      name: 'FeatureRecordReader',
      type: 'ANALYSIS',
      description: 'Reads FT records',
    },
    {
      id: 'PortingCandidateEvaluator',
      name: 'PortingCandidateEvaluator',
      type: 'GOVERNANCE',
      description: 'Aggregates portingCandidate signals',
    },
    {
      id: 'CapabilityGapSignalEmitter',
      name: 'CapabilityGapSignalEmitter',
      type: 'EMIT',
      description: 'Emits capability.gap.detected',
    },
  ],
  edges: [
    { from: 'PhaseGateRequested', to: 'FlowActiveGuard' },
    { from: 'FlowActiveGuard', to: 'PhaseRecordReader', condition: 'FLOW-36 ACTIVE' },
    { from: 'PhaseRecordReader', to: 'FeatureRecordReader', condition: 'status=COMPLETE' },
    { from: 'FeatureRecordReader', to: 'PortingCandidateEvaluator' },
    {
      from: 'PortingCandidateEvaluator',
      to: 'CapabilityGapSignalEmitter',
      condition: 'gap detected',
    },
    {
      from: 'FlowActiveGuard',
      to: 'GateBlocked',
      condition: 'FLOW-36 not ACTIVE',
      type: 'terminal',
    },
    {
      from: 'PortingCandidateEvaluator',
      to: 'GatePass',
      condition: 'candidates > 0',
      type: 'terminal-success',
    },
    { from: 'CapabilityGapSignalEmitter', to: 'GapSignalRecorded', type: 'terminal' },
  ],
};

const RUN_STATE_CLEAN = {
  nodeStates: {
    FlowActiveGuard: { status: 'COMPLETE' },
    PhaseRecordReader: { status: 'COMPLETE' },
    FeatureRecordReader: { status: 'COMPLETE' },
    PortingCandidateEvaluator: { status: 'COMPLETE' },
    CapabilityGapSignalEmitter: { status: 'PENDING' },
  },
  cycle2Traces: [
    {
      round: 1,
      stepText: 'Evaluate candidate',
      chosen: { model: 'mock-gemini', score: 7.4 },
      rejected: { model: 'mock-claude', score: 6.2 },
      discarded: null,
    },
    {
      round: 2,
      stepText: 'Evaluate candidate',
      chosen: { model: 'mock-gemini', score: 7.8 },
      rejected: { model: 'mock-openai', score: 6.0 },
      discarded: null,
    },
  ],
  cycle3Traces: [],
  subFlows: [],
  suspensions: [],
};

const RUN_STATE_SUSPENDED = {
  nodeStates: {
    FlowActiveGuard: { status: 'SUSPENDED' },
    PhaseRecordReader: { status: 'PENDING' },
    FeatureRecordReader: { status: 'PENDING' },
    PortingCandidateEvaluator: { status: 'PENDING' },
    CapabilityGapSignalEmitter: { status: 'PENDING' },
  },
  cycle2Traces: [],
  cycle3Traces: [],
  subFlows: [],
  suspensions: [
    {
      id: 'susp-001',
      nodeId: 'FlowActiveGuard',
      gapDescription: 'Is FLOW-36 active?',
      gapRequest: ['What is the current FLOW-36 status?', 'When did FLOW-36 last run?'],
    },
  ],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TopologyViewer', () => {
  it('renders nodes from topology contract', async () => {
    mockFetchOnce(TOPOLOGY);

    render(<TopologyViewer flowId="FLOW-37" />);

    await waitFor(() => {
      const nodes = screen.getAllByTestId('topology-node');
      expect(nodes.length).toBeGreaterThan(0);
    });

    expect(screen.getAllByTestId('topology-node').length).toBe(5);
    // E1: verify data-node-id propagates
    const firstNode = screen.getAllByTestId('topology-node')[0];
    expect(firstNode).toHaveAttribute('data-node-id');
  });

  it('shows SUSPENDED badge on suspended node when runId provided', async () => {
    mockFetchOnce({ topology: TOPOLOGY, runState: RUN_STATE_SUSPENDED });

    render(<TopologyViewer flowId="FLOW-37" runId="run-with-suspension" />);

    await waitFor(() => {
      expect(screen.getByTestId('node-suspended-badge')).toBeInTheDocument();
    });
  });

  it('SuspensionCard shows gap questions and resume button', async () => {
    mockFetchOnce({ topology: TOPOLOGY, runState: RUN_STATE_SUSPENDED });

    render(<TopologyViewer flowId="FLOW-37" runId="run-with-suspension" />);

    await waitFor(() => {
      expect(screen.getByTestId('resume-button')).toBeInTheDocument();
    });

    expect(screen.getByText(/FLOW-36 status/i)).toBeInTheDocument();
    expect(screen.getByText(/FLOW-36 last run/i)).toBeInTheDocument();
  });

  it('score spread chart renders for Cycle 2 traces', async () => {
    mockFetchOnce({ topology: TOPOLOGY, runState: RUN_STATE_CLEAN });

    render(<TopologyViewer flowId="FLOW-37" runId="run-with-traces" />);

    await waitFor(() => {
      expect(screen.getByTestId('score-spread-chart')).toBeInTheDocument();
    });
  });

  it('shows neutral empty state when draft topology response has no JSON body', async () => {
    mockEmptyTopologyResponseOnce();

    render(<TopologyViewer flowId="FLOW-18" />);

    await waitFor(() => {
      expect(screen.getByTestId('topology-viewer-empty')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Unexpected end of JSON input/i)).not.toBeInTheDocument();
  });
});
