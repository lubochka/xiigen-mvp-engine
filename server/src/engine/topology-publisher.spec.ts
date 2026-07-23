/**
 * Tests for TopologyPublisher (Track 0 Turn 3).
 *
 * Covers:
 *   - Sequential algorithm (v23 Finding EE): flat array, prev→curr edges.
 *   - EXPAND skip (Pass 7): only LEAF nodes render.
 *   - Slugify uniqueness (v23 Finding EE + v27 Finding PP): duplicate stepText OK.
 *   - Edge cases: empty topology, all-EXPAND topology, unicode stepText.
 *   - Display name (v19 Finding Y): userIntent passed through.
 *   - Version locked to 'v1' (v17 Finding V).
 *   - DataProcessResult unwrap / failure propagation.
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { TopologyPublisher } from './topology-publisher';
import { TenantTopologyStore } from './tenant-topology-store';
import type { Cycle2StepTrace, CycleChainOutput, TopologyNode } from './cycle-chain.service';

function makeOutput(
  topology: TopologyNode[],
  overrides: Partial<CycleChainOutput> = {},
): CycleChainOutput {
  return {
    runId: 'run-abc',
    flowId: 'FLOW-CHAIN-ABC',
    grade: 8.5,
    totalCostUsd: 0.05,
    planSteps: [],
    leafNodes: [],
    topology,
    cycles: {
      cycle1: {} as never,
      cycle2: [] as Cycle2StepTrace[],
      cycle3: {} as never,
    },
    pendingImplementations: [],
    status: 'COMPLETE',
    subFlows: [],
    suspensions: [],
    cycleTraces: [],
    ...overrides,
  } as unknown as CycleChainOutput;
}

/** Turn 2 (MVP Plan v3) — minimal Cycle2StepTrace fixture. */
function makeStep(overrides: Partial<Cycle2StepTrace> = {}): Cycle2StepTrace {
  return {
    stepText: 'Step default',
    depth: 0,
    nodeIntent: 'intent',
    grade: 9.2,
    accepted: true,
    roundsCompleted: 3,
    stagnationFired: false,
    cycle4Id: 'c4-default',
    winnerModel: 'gemini',
    winnerSelfScore: 9.0,
    arbiters: [],
    promptSent: { nodePrompt: '', judgeSystemPrompt: '' },
    rounds: [],
    ...overrides,
  } as Cycle2StepTrace;
}

function makeStoreMock(): { store: TenantTopologyStore; storePrivate: jest.Mock } {
  const storePrivate = jest
    .fn()
    .mockImplementation((t) => Promise.resolve(DataProcessResult.success(t)));
  return {
    store: { storePrivate } as unknown as TenantTopologyStore,
    storePrivate,
  };
}

describe('TopologyPublisher', () => {
  it('publishes sequential flat topology with prev→curr edges', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const output = makeOutput([
      { stepText: 'Accept credentials', verdict: 'LEAF', depth: 0, children: [] },
      { stepText: 'Validate input', verdict: 'LEAF', depth: 0, children: [] },
      { stepText: 'Emit event', verdict: 'LEAF', depth: 0, children: [] },
    ]);

    await publisher.publish(output);

    expect(storePrivate).toHaveBeenCalledTimes(1);
    const stored = storePrivate.mock.calls[0][0];
    expect(stored.nodes).toHaveLength(3);
    expect(stored.edges).toHaveLength(2);
    expect(stored.edges[0]).toEqual({ from: 'accept-credentials-0', to: 'validate-input-1' });
    expect(stored.edges[1]).toEqual({ from: 'validate-input-1', to: 'emit-event-2' });
  });

  it('skips EXPAND nodes (Pass 7)', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const output = makeOutput([
      { stepText: 'Step A', verdict: 'LEAF', depth: 0, children: [] },
      { stepText: 'Expand this', verdict: 'EXPAND', depth: 0, children: [] },
      { stepText: 'Step B', verdict: 'LEAF', depth: 0, children: [] },
    ]);

    await publisher.publish(output);

    const stored = storePrivate.mock.calls[0][0];
    expect(stored.nodes).toHaveLength(2);
    expect(stored.nodes.map((n: { name: string }) => n.name)).toEqual(['Step A', 'Step B']);
  });

  it('handles duplicate stepText via index suffix (v23 Finding EE + v27 Finding PP)', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    // Two identical stepTexts — slugify alone would collide
    const output = makeOutput([
      { stepText: 'Validate input', verdict: 'LEAF', depth: 0, children: [] },
      { stepText: 'Validate input', verdict: 'LEAF', depth: 0, children: [] },
    ]);

    await publisher.publish(output);

    const stored = storePrivate.mock.calls[0][0];
    expect(stored.nodes[0].nodeId).toBe('validate-input-0');
    expect(stored.nodes[1].nodeId).toBe('validate-input-1');
    expect(stored.nodes[0].nodeId).not.toBe(stored.nodes[1].nodeId);
  });

  it('handles empty topology with EMPTY_TOPOLOGY failure', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const result = await publisher.publish(makeOutput([]));

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EMPTY_TOPOLOGY');
    expect(storePrivate).not.toHaveBeenCalled();
  });

  it('handles all-EXPAND topology with NO_LEAF_NODES failure', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const result = await publisher.publish(
      makeOutput([
        { stepText: 'X', verdict: 'EXPAND', depth: 0, children: [] },
        { stepText: 'Y', verdict: 'EXPAND', depth: 0, children: [] },
      ]),
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_LEAF_NODES');
    expect(storePrivate).not.toHaveBeenCalled();
  });

  it('v19 Finding Y: uses displayName when provided', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const output = makeOutput([{ stepText: 'Step A', verdict: 'LEAF', depth: 0, children: [] }]);

    await publisher.publish(output, 'Build a user registration system');

    const stored = storePrivate.mock.calls[0][0];
    expect(stored.name).toBe('Build a user registration system');
    expect(stored.name).not.toBe(output.flowId);
  });

  it('v19 Finding Y: falls back to flowId when displayName is absent', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const output = makeOutput([{ stepText: 'Step A', verdict: 'LEAF', depth: 0, children: [] }]);

    await publisher.publish(output);

    const stored = storePrivate.mock.calls[0][0];
    expect(stored.name).toBe(output.flowId);
  });

  it('v17 Finding V: version locked to v1', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const output = makeOutput([{ stepText: 'Step A', verdict: 'LEAF', depth: 0, children: [] }]);

    await publisher.publish(output);

    const stored = storePrivate.mock.calls[0][0];
    expect(stored.version).toBe('v1');
  });

  it('stores sourceRunId from output.runId', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const output = makeOutput([{ stepText: 'Step A', verdict: 'LEAF', depth: 0, children: [] }], {
      runId: 'run-xyz-123',
    });

    await publisher.publish(output);

    const stored = storePrivate.mock.calls[0][0];
    expect(stored.sourceRunId).toBe('run-xyz-123');
  });

  it('handles unicode and special-char stepText via slugify (v27 Finding PP edge cases)', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const output = makeOutput([
      { stepText: '!@#$%^&*()', verdict: 'LEAF', depth: 0, children: [] }, // all-special
      { stepText: 'Step with émoji 🚀', verdict: 'LEAF', depth: 0, children: [] }, // unicode
    ]);

    await publisher.publish(output);

    const stored = storePrivate.mock.calls[0][0];
    // Both should produce valid, unique nodeIds via index suffix
    expect(stored.nodes[0].nodeId).toMatch(/-0$/);
    expect(stored.nodes[1].nodeId).toMatch(/-1$/);
    expect(stored.nodes[0].nodeId).not.toBe(stored.nodes[1].nodeId);
  });

  it('v11 (Turn 11) — subflow options populate parentRunId + parentNodeId + isSubFlow metadata', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const output = makeOutput([
      { stepText: 'Subflow step A', verdict: 'LEAF', depth: 1, children: [] },
    ]);

    await publisher.publish(output, 'Delegated sub-intent', {
      parentRunId: 'run-parent-123',
      parentNodeId: 'node-a1',
    });

    const stored = storePrivate.mock.calls[0][0];
    expect(stored.parentRunId).toBe('run-parent-123');
    expect(stored.parentNodeId).toBe('node-a1');
    expect(stored.metadata.isSubFlow).toBe(true);
  });

  it('v11 — top-level publish (no options) does NOT set parentRunId/isSubFlow', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    await publisher.publish(
      makeOutput([{ stepText: 'Top-level step', verdict: 'LEAF', depth: 0, children: [] }]),
      'Top-level flow',
    );

    const stored = storePrivate.mock.calls[0][0];
    expect(stored.parentRunId).toBeUndefined();
    expect(stored.parentNodeId).toBeUndefined();
    expect(stored.metadata.isSubFlow).toBeUndefined();
  });

  it('propagates store failure through DataProcessResult', async () => {
    const storePrivate = jest
      .fn()
      .mockResolvedValue(DataProcessResult.failure<never>('STORE_FAILED', 'mock store failure'));
    const store = { storePrivate } as unknown as TenantTopologyStore;
    const publisher = new TopologyPublisher(store);

    const result = await publisher.publish(
      makeOutput([{ stepText: 'Step A', verdict: 'LEAF', depth: 0, children: [] }]),
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STORE_FAILED');
  });

  // ── Turn 2 (MVP Plan v3, Goals 1b + 1c) ────────────────────────────────────

  it('Turn 2: default publish() tags metadata.sourceType = DESIGN_SIM', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    await publisher.publish(
      makeOutput([{ stepText: 'Step A', verdict: 'LEAF', depth: 0, children: [] }]),
      'Build an app',
    );

    const stored = storePrivate.mock.calls[0][0];
    expect(stored.metadata.sourceType).toBe('DESIGN_SIM');
    expect(stored.flowId).toBe('FLOW-CHAIN-ABC');
  });

  it('Turn 2: publishTeachRun stores Cycle 2 steps as a separate -teach flow', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const output = makeOutput([], {
      cycles: {
        cycle1: {} as never,
        cycle2: [
          makeStep({
            stepText: 'Design auth API',
            grade: 9.1,
            accepted: true,
            winnerModel: 'gemini',
          }),
          makeStep({
            stepText: 'Handle edge cases',
            grade: 8.4,
            accepted: true,
            winnerModel: 'openai',
          }),
        ],
        cycle3: {} as never,
      },
    } as Partial<CycleChainOutput>);

    const r = await publisher.publishTeachRun(output, 'Onboarding flow');

    expect(r.isSuccess).toBe(true);
    expect(storePrivate).toHaveBeenCalledTimes(1);
    const stored = storePrivate.mock.calls[0][0];
    expect(stored.flowId).toBe('FLOW-CHAIN-ABC-teach');
    expect(stored.name).toBe('Onboarding flow — Teach');
    expect(stored.status).toBe('PUBLISHED');
    expect(stored.nodes).toHaveLength(2);
    expect(stored.metadata.sourceType).toBe('TEACH_RUN');
    expect(stored.metadata.sourceFlowId).toBe('FLOW-CHAIN-ABC');
    expect(stored.metadata.stepCount).toBe(2);
    // Per-step grade/depth carried in config (backward-compat: no new interface fields)
    expect(stored.nodes[0].config.grade).toBe(9.1);
    expect(stored.nodes[0].config.depth).toBe(0);
    expect(stored.nodes[0].config.winnerModel).toBe('gemini');
    expect(stored.edges).toHaveLength(1);
    expect(stored.edges[0].from).toBe(stored.nodes[0].nodeId);
    expect(stored.edges[0].to).toBe(stored.nodes[1].nodeId);
  });

  it('Turn 2: publishTeachRun fails with NO_TEACH_STEPS when cycle2 empty', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const r = await publisher.publishTeachRun(makeOutput([]));
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('NO_TEACH_STEPS');
    expect(storePrivate).not.toHaveBeenCalled();
  });

  it('Turn 2: publishQaRun skips with QA_NOT_TRIGGERED when grade >= 0.85', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const output = makeOutput([], {
      grade: 0.92,
      cycles: {
        cycle1: {} as never,
        cycle2: [makeStep({ grade: 0.9, accepted: true })],
        cycle3: {} as never,
      },
    } as Partial<CycleChainOutput>);

    const r = await publisher.publishQaRun(output);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('QA_NOT_TRIGGERED');
    expect(storePrivate).not.toHaveBeenCalled();
  });

  it('Turn 2: publishQaRun filters to rejected/low-grade steps when grade < 0.85', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    const output = makeOutput([], {
      grade: 0.72,
      cycles: {
        cycle1: {} as never,
        cycle2: [
          makeStep({ stepText: 'Accepted good', grade: 0.9, accepted: true }), // excluded
          makeStep({
            stepText: 'Rejected bad',
            grade: 0.4,
            accepted: false,
            rejectionReason: 'arbiter block',
          }), // included
          makeStep({ stepText: 'Below threshold', grade: 0.6, accepted: true }), // included (low grade)
        ],
        cycle3: {} as never,
      },
    } as Partial<CycleChainOutput>);

    const r = await publisher.publishQaRun(output, 'My intent');
    expect(r.isSuccess).toBe(true);
    const stored = storePrivate.mock.calls[0][0];
    expect(stored.flowId).toBe('FLOW-CHAIN-ABC-qa');
    expect(stored.name).toBe('My intent — QA');
    expect(stored.status).toBe('DRAFT'); // proposals, not validated
    expect(stored.nodes).toHaveLength(2);
    expect(stored.nodes.map((n: { name: string }) => n.name)).toEqual([
      'Rejected bad',
      'Below threshold',
    ]);
    expect(stored.metadata.sourceType).toBe('QA_RUN');
    expect(stored.metadata.sourceFlowId).toBe('FLOW-CHAIN-ABC');
    expect(stored.metadata.rejectedStepCount).toBe(2);
    expect(stored.metadata.totalStepCount).toBe(3);
    expect(stored.metadata.qaThreshold).toBe(0.85);
    expect(stored.nodes[0].config.rejectionReason).toBe('arbiter block');
  });

  it('Turn 2: publishQaRun fails with NO_QA_STEPS when grade<0.85 but every step accepted above threshold', async () => {
    const { store, storePrivate } = makeStoreMock();
    const publisher = new TopologyPublisher(store);

    // Pathological: overall grade below threshold but no individual step qualifies.
    // (e.g. aggregation rules differ from per-step filter — guard against empty QA records.)
    const output = makeOutput([], {
      grade: 0.7,
      cycles: {
        cycle1: {} as never,
        cycle2: [makeStep({ grade: 0.95, accepted: true })],
        cycle3: {} as never,
      },
    } as Partial<CycleChainOutput>);

    const r = await publisher.publishQaRun(output);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('NO_QA_STEPS');
    expect(storePrivate).not.toHaveBeenCalled();
  });
});
