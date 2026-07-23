/**
 * TopologyController — unit tests.
 *
 * Uses real fixture schema from phase-capability-gate.topology.json:
 *   nodes: { id, name, type (VALIDATION|ANALYSIS|GOVERNANCE|EMIT), description }
 *   edges: { from, to, condition?, type? (terminal|terminal-success) }
 *
 * 3 tests:
 *   1. GET /api/topology/:flowId returns first topology record
 *   2. GET /api/topology/:flowId/run/:runId includes nodeStates
 *   3. nodeStates reflect SUSPENDED when suspension present
 */

import { TopologyController, RunState } from './topology.controller';
import { TopologyStore } from '../engine/topology-store';
import { IDatabaseService } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';

// ── Fixture data (real schema from phase-capability-gate.topology.json) ────────

const FIXTURE_TOPOLOGY = {
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
    {
      from: 'FlowActiveGuard',
      to: 'GateBlocked',
      condition: 'FLOW-36 not ACTIVE',
      type: 'terminal',
    },
    { from: 'FlowActiveGuard', to: 'PhaseRecordReader', condition: 'FLOW-36 ACTIVE' },
    {
      from: 'PhaseRecordReader',
      to: 'BootstrapRequired',
      condition: 'NOT_FOUND',
      type: 'terminal',
    },
    { from: 'PhaseRecordReader', to: 'FeatureRecordReader', condition: 'status=COMPLETE' },
    { from: 'FeatureRecordReader', to: 'PortingCandidateEvaluator' },
    {
      from: 'PortingCandidateEvaluator',
      to: 'GatePass',
      condition: 'candidates > 0',
      type: 'terminal-success',
    },
    {
      from: 'PortingCandidateEvaluator',
      to: 'CapabilityGapSignalEmitter',
      condition: 'gap detected',
    },
    { from: 'CapabilityGapSignalEmitter', to: 'GapSignalRecorded', type: 'terminal' },
  ],
};

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeTopologyStore(topologies: unknown[] = [FIXTURE_TOPOLOGY]): jest.Mocked<TopologyStore> {
  return {
    listTopologies: jest.fn().mockResolvedValue(DataProcessResult.success(topologies)),
    getTopology: jest.fn(),
    storeTopology: jest.fn(),
  } as unknown as jest.Mocked<TopologyStore>;
}

function makeDb(
  runStateItems: Record<string, unknown>[] = [],
  tripleItems: Record<string, unknown>[] = [],
): jest.Mocked<IDatabaseService> {
  const mock = {
    searchDocuments: jest
      .fn()
      .mockImplementation((_index: string, filters: Record<string, unknown>) => {
        if (filters['station'] === 'CYCLE-2') {
          return Promise.resolve(DataProcessResult.success(tripleItems));
        }
        if (filters['station'] === 'CYCLE-3') {
          return Promise.resolve(DataProcessResult.success([]));
        }
        // xiigen-run-state
        return Promise.resolve(DataProcessResult.success(runStateItems));
      }),
  };
  return mock as unknown as jest.Mocked<IDatabaseService>;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('TopologyController', () => {
  it('GET /api/topology/:flowId returns topology with real schema', async () => {
    const store = makeTopologyStore();
    const db = makeDb();
    const ctrl = new TopologyController(store, db);

    const result = (await ctrl.getTopology('FLOW-37')) as unknown as typeof FIXTURE_TOPOLOGY;

    expect(result).not.toHaveProperty('error');
    expect(result.flowId).toBe('FLOW-37');
    expect(result.topologyId).toBe('phase-capability-gate');
    expect(Array.isArray(result.nodes)).toBe(true);
    expect(result.nodes.length).toBe(5);
    expect(result.nodes[0]?.type).toBe('VALIDATION');
    expect(result.edges.some((e: { type?: string }) => e.type === 'terminal')).toBe(true);
    expect(store.listTopologies).toHaveBeenCalledWith('FLOW-37');
  });

  it('GET /api/topology/:flowId/run/:runId includes nodeStates', async () => {
    const store = makeTopologyStore();
    const db = makeDb(
      [],
      [
        {
          round: 1,
          stepText: 'Evaluate',
          chosen: { model: 'mock-gemini', score: 7.4 },
          rejected: { model: 'mock-claude', score: 6.2 },
        },
      ],
    );
    const ctrl = new TopologyController(store, db);

    const result = (await ctrl.getTopologyWithRunState('FLOW-37', 'run-abc')) as {
      topology: unknown;
      runState: RunState;
    };

    expect(result).not.toHaveProperty('error');
    expect(result.topology).toBeDefined();
    expect(result.runState).toHaveProperty('nodeStates');
    expect(result.runState).toHaveProperty('cycle2Traces');
    expect(result.runState).toHaveProperty('suspensions');
    // With cycle2Traces present, all nodes should be COMPLETE
    expect(result.runState.nodeStates['FlowActiveGuard']?.status).toBe('COMPLETE');
  });

  it('nodeStates reflect SUSPENDED when RunSuspension present', async () => {
    const store = makeTopologyStore();
    const db = makeDb([
      {
        suspensionReason: 'CONTEXT_INSUFFICIENT',
        id: 'susp-001',
        nodeId: 'FlowActiveGuard',
        gapDescription: 'Is FLOW-36 active?',
        gapRequest: ['Q1', 'Q2'],
      },
    ]);
    const ctrl = new TopologyController(store, db);

    const result = (await ctrl.getTopologyWithRunState('FLOW-37', 'run-suspended')) as {
      topology: unknown;
      runState: RunState;
    };

    expect(result.runState.nodeStates['FlowActiveGuard']?.status).toBe('SUSPENDED');
    expect(result.runState.suspensions.length).toBe(1);
    expect(result.runState.suspensions[0]?.gapRequest.length).toBe(2);
  });
});
