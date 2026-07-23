/**
 * TopologyViewer — React component for visualizing XIIGen flow topologies.
 *
 * Static mode: reads topology + run state via REST (no SSE — FLOW-40 not available).
 * Uses ReactFlow for DAG rendering.
 *
 * Real topology schema (phase-capability-gate.topology.json):
 *   nodes: { id, name, type (VALIDATION|ANALYSIS|GOVERNANCE|EMIT), description }
 *   edges: { from, to, condition?, type? (terminal|terminal-success) }
 *
 * Features:
 *   - ReactFlow DAG of nodes + edges, color-coded by node type
 *   - Run state overlay: PENDING/COMPLETE/SUSPENDED/EXPANDED node borders
 *   - DPO score spread sparklines per cycle2Trace entry (when run data provided)
 *   - SuspensionCard list with gapRequest questions + Resume Run button
 *
 * Props:
 *   flowId — identifies the topology contract to load
 *   runId  — if provided: fetches run state and shows overlays
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

// ── Type definitions ──────────────────────────────────────────────────────────

export interface TopologyNodeDef {
  id: string;
  name: string;
  type: 'VALIDATION' | 'ANALYSIS' | 'GOVERNANCE' | 'EMIT' | string;
  description: string;
}

export interface TopologyEdgeDef {
  from: string;
  to: string;
  condition?: string;
  type?: 'terminal' | 'terminal-success' | string;
}

export interface TopologyContract {
  flowId: string;
  topologyId?: string;
  version: string;
  description?: string;
  nodes: TopologyNodeDef[];
  edges: TopologyEdgeDef[];
}

export interface DpoTriple {
  round: number;
  stepText: string;
  chosen: { model: string; score: number };
  rejected: { model: string; score: number };
  discarded: { model: string; score: number } | null;
}

export interface RunSuspension {
  id: string;
  nodeId: string;
  gapDescription: string;
  gapRequest: string[];
}

export interface SubFlowRef {
  id: string;
  parentNodeId: string;
  childRunId: string;
  status: string;
}

export interface NodeStateEntry {
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'SUSPENDED' | 'EXPANDED';
}

export interface RunState {
  nodeStates: Record<string, NodeStateEntry>;
  cycle2Traces: DpoTriple[];
  cycle3Traces: Array<Record<string, unknown>>;
  subFlows: SubFlowRef[];
  suspensions: RunSuspension[];
}

export interface TopologyViewerProps {
  flowId: string;
  runId?: string;
  /**
   * Turn 3 (MVP Plan v3, Goal 2) — optional version selector. When present,
   * the topology fetch appends ?version=X so TenantTopologyStore.getById
   * returns that specific stored version (PUBLISHED or DRAFT or ARCHIVED).
   */
  version?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Node type → background color */
const TYPE_COLORS: Record<string, string> = {
  VALIDATION: '#FEF9C3', // yellow-100
  ANALYSIS: '#DBEAFE', // blue-100
  GOVERNANCE: '#F3E8FF', // purple-100
  EMIT: '#DCFCE7', // green-100
};

/** Node type → border color */
const TYPE_BORDER: Record<string, string> = {
  VALIDATION: '#FDE047', // yellow-300
  ANALYSIS: '#93C5FD', // blue-300
  GOVERNANCE: '#D8B4FE', // purple-300
  EMIT: '#86EFAC', // green-300
};

/** Run state → border override color */
const STATE_BORDER: Record<string, string> = {
  SUSPENDED: '#F97316', // orange-500
  EXPANDED: '#6366F1', // indigo-500
  RUNNING: '#3B82F6', // blue-500
  COMPLETE: '#22C55E', // green-500
  PENDING: '#D1D5DB', // gray-300
};

const NODE_W = 200;
const NODE_H = 80;
const COL_GAP = 250;
const ROW_GAP = 120;

// ── Layout: simple column layout by in-degree BFS ─────────────────────────────

function computeLayout(
  nodes: TopologyNodeDef[],
  edges: TopologyEdgeDef[],
): Map<string, { x: number; y: number }> {
  // Build adjacency
  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const n of nodes) {
    inDegree.set(n.id, 0);
    children.set(n.id, []);
  }
  for (const e of edges) {
    if (inDegree.has(e.to)) inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    if (children.has(e.from)) children.get(e.from)!.push(e.to);
  }
  // BFS layers
  const layers: string[][] = [];
  const queue: string[] = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const placed = new Set<string>();
  while (queue.length > 0) {
    const layer: string[] = [];
    const next: string[] = [];
    for (const id of queue) {
      if (placed.has(id)) continue;
      placed.add(id);
      layer.push(id);
      for (const c of children.get(id) ?? []) {
        if (!placed.has(c)) next.push(c);
      }
    }
    if (layer.length > 0) layers.push(layer);
    queue.splice(0, queue.length, ...next);
  }
  // Any unplaced nodes (disconnected) go in last layer
  for (const n of nodes) {
    if (!placed.has(n.id)) layers.push([n.id]);
  }
  // Assign positions
  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, col) => {
    layer.forEach((id, row) => {
      positions.set(id, { x: col * COL_GAP, y: row * ROW_GAP });
    });
  });
  return positions;
}

// ── ScoreSpreadChart ──────────────────────────────────────────────────────────

interface ScoreSpreadChartProps {
  triples: DpoTriple[];
}

function ScoreSpreadChart({ triples }: ScoreSpreadChartProps) {
  const W = 120,
    H = 40;
  const barW = Math.max(4, Math.floor((W - 4) / Math.max(triples.length, 1)));
  return (
    <svg
      width={W}
      height={H}
      data-testid="score-spread-chart"
      aria-label="DPO score spread per round"
      style={{ display: 'block' }}
    >
      {triples.map((t, i) => {
        const chosenH = Math.round((t.chosen.score / 10) * (H - 4));
        const rejH = Math.round((t.rejected.score / 10) * (H - 4));
        const x = 2 + i * barW;
        return (
          <g key={t.round}>
            <rect
              x={x}
              y={H - 2 - chosenH}
              width={barW - 1}
              height={chosenH}
              fill="#4ADE80"
              opacity={0.85}
            />
            <rect
              x={x}
              y={H - 2 - rejH}
              width={barW - 1}
              height={rejH}
              fill="#F97316"
              opacity={0.65}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ── SuspensionCard ────────────────────────────────────────────────────────────

interface SuspensionCardProps {
  suspension: RunSuspension;
  runId: string;
}

function SuspensionCard({ suspension, runId }: SuspensionCardProps) {
  const [answers, setAnswers] = useState<string[]>(() => suspension.gapRequest.map(() => ''));
  const [resuming, setResuming] = useState(false);
  const [resumeMsg, setResumeMsg] = useState<string | null>(null);

  const onResume = useCallback(async () => {
    setResuming(true);
    try {
      const res = await fetch(`/api/cycle-chain/${runId}/resume`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensionId: suspension.id, answers }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResumeMsg('Run resumed successfully.');
    } catch (err) {
      setResumeMsg(`Resume failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setResuming(false);
    }
  }, [answers, runId, suspension.id]);

  return (
    <div
      style={{
        border: '1px solid #F97316',
        borderRadius: 6,
        padding: 12,
        marginBottom: 12,
        background: '#FFF7ED',
      }}
      data-testid="node-suspended-badge"
    >
      <div style={{ fontWeight: 600, fontSize: 13, color: '#C2410C', marginBottom: 6 }}>
        Suspended: {suspension.nodeId}
      </div>
      <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>
        {suspension.gapDescription}
      </div>
      {suspension.gapRequest.map((q, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 2 }}>
            {q}
          </label>
          <input
            type="text"
            value={answers[i] ?? ''}
            onChange={(e) => {
              const next = [...answers];
              next[i] = e.target.value;
              setAnswers(next);
            }}
            style={{
              width: '100%',
              fontSize: 12,
              border: '1px solid #D1D5DB',
              borderRadius: 4,
              padding: '4px 6px',
            }}
            placeholder="Your answer…"
          />
        </div>
      ))}
      {resumeMsg && (
        <div
          style={{
            fontSize: 11,
            color: resumeMsg.startsWith('Resume failed') ? '#DC2626' : '#16A34A',
            marginBottom: 6,
          }}
        >
          {resumeMsg}
        </div>
      )}
      <button
        onClick={onResume}
        disabled={resuming}
        data-testid="resume-button"
        style={{
          marginTop: 4,
          padding: '5px 12px',
          fontSize: 12,
          background: resuming ? '#9CA3AF' : '#EA580C',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: resuming ? 'not-allowed' : 'pointer',
        }}
      >
        {resuming ? 'Resuming…' : 'Resume Run'}
      </button>
    </div>
  );
}

// ── Custom ReactFlow node ─────────────────────────────────────────────────────

interface TopologyNodeData {
  label: string;
  nodeType: string;
  nodeId: string; // E1 addition — n1, n2, ... n8
  nodeState: NodeStateEntry | null;
  description?: string;
}

function TopologyNodeComponent({ data }: { data: TopologyNodeData }) {
  const bg = TYPE_COLORS[data.nodeType] ?? '#F9FAFB';
  const border = data.nodeState
    ? (STATE_BORDER[data.nodeState.status] ?? TYPE_BORDER[data.nodeType] ?? '#E5E7EB')
    : (TYPE_BORDER[data.nodeType] ?? '#E5E7EB');

  return (
    <div
      data-testid="topology-node"
      data-node-id={data.nodeId}
      data-node-type={data.nodeType}
      style={{
        width: NODE_W,
        height: NODE_H,
        background: bg,
        border: `2px solid ${border}`,
        borderRadius: 8,
        padding: '8px 10px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {data.nodeType}
      </div>
      <div
        style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginTop: 2, lineHeight: '1.3' }}
      >
        {data.label}
      </div>
      {data.nodeState && (
        <div style={{ fontSize: 10, color: border, marginTop: 3, fontWeight: 600 }}>
          {data.nodeState.status}
        </div>
      )}
      {data.description && (
        <div
          data-testid="topology-node-description"
          style={{
            fontSize: 9,
            color: '#374151',
            marginTop: 2,
            lineHeight: '1.2',
            overflow: 'hidden',
          }}
        >
          {data.description}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { topologyNode: TopologyNodeComponent };

// ── TopologyViewer ────────────────────────────────────────────────────────────

export function TopologyViewer({ flowId, runId, version }: TopologyViewerProps) {
  const [topology, setTopology] = useState<TopologyContract | null>(null);
  const [runState, setRunState] = useState<RunState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // RUN-64 (FLOW-18 examination H9 fix): distinguish "topology empty / not
  // saved yet" from real fetch errors. The unloaded case renders as a
  // neutral empty-state, not a red error — "No saved topology" is a valid
  // initial state on the DRAFT editor, not a failure the user must recover
  // from. REPAIR-GUIDANCE Part 3 NEEDS_ERROR_HANDLING decision tree.
  const [isMissingTopology, setIsMissingTopology] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch topology (+ optional run state)
  useEffect(() => {
    setLoading(true);
    setError(null);
    setIsMissingTopology(false);

    const baseUrl = runId
      ? `/api/topology/${encodeURIComponent(flowId)}/run/${encodeURIComponent(runId)}`
      : `/api/topology/${encodeURIComponent(flowId)}`;
    // Turn 3 — version query param only applies to the no-runId path
    // (TopologyController.getTopology). The runId path already binds a specific
    // run which was produced against a specific topology version.
    const url = !runId && version ? `${baseUrl}?version=${encodeURIComponent(version)}` : baseUrl;

    fetch(url)
      .then((r) => r.json())
      .then((data: unknown) => {
        const d = data as Record<string, unknown>;
        if (d['error']) {
          if (d['code'] === 'TOPOLOGY_NOT_FOUND') {
            setTopology(null);
            setRunState(null);
            setIsMissingTopology(true);
            setLoading(false);
            return;
          }
          setError(String(d['error']));
          setLoading(false);
          return;
        }
        let topo: TopologyContract;
        let rs: RunState | null = null;
        if (runId && d['topology']) {
          topo = d['topology'] as TopologyContract;
          rs = d['runState'] as RunState;
        } else {
          topo = d as unknown as TopologyContract;
        }
        setTopology(topo);
        setRunState(rs);
        setLoading(false);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        if (err instanceof SyntaxError && message.includes('JSON')) {
          setTopology(null);
          setRunState(null);
          setIsMissingTopology(true);
          setLoading(false);
          return;
        }
        setError(message);
        setLoading(false);
      });
  }, [flowId, runId, version]);

  // Build ReactFlow nodes + edges when topology/runState changes
  useEffect(() => {
    if (!topology) return;

    // RUN-47e guard (refined RUN-64): when the topology endpoint returns a
    // malformed payload (e.g. HTML 404 shell, empty {}, or a response missing
    // nodes/edges arrays because NestJS is unreachable), computeLayout throws
    // 'nodes is not iterable' and crashes the whole page tree under the error
    // boundary. Fall back to an isMissingTopology flag so the render path can
    // show a neutral "No saved topology yet" empty-state — NOT a red error.
    // "Backend may be unreachable" is engineering language that should never
    // leak as a normal state to admin or tenant users.
    if (!Array.isArray(topology.nodes) || !Array.isArray(topology.edges)) {
      setIsMissingTopology(true);
      setNodes([]);
      setEdges([]);
      return;
    }

    const positions = computeLayout(topology.nodes, topology.edges);

    const rfNodes: Node[] = topology.nodes.map((n) => {
      const pos = positions.get(n.id) ?? { x: 0, y: 0 };
      const nodeState = runState?.nodeStates[n.id] ?? null;
      return {
        id: n.id,
        type: 'topologyNode',
        position: pos,
        data: {
          label: n.name ?? n.id,
          nodeType: n.type,
          nodeId: n.id, // E1 addition
          nodeState,
          description: n.description,
        } as TopologyNodeData,
      };
    });

    const rfEdges: Edge[] = topology.edges
      .filter((e) => positions.has(e.from) && positions.has(e.to))
      .map((e, i) => ({
        id: `e-${i}-${e.from}-${e.to}`,
        source: e.from,
        target: e.to,
        label: e.condition,
        animated: false,
        style: {
          stroke: e.type === 'terminal-success' ? '#22C55E' : '#9CA3AF',
          strokeDasharray:
            e.type === 'terminal' || e.type === 'terminal-success' ? '5 3' : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9CA3AF' },
        labelStyle: { fontSize: 9, fill: '#6B7280' },
        labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.8 },
      }));

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [topology, runState, setNodes, setEdges]);

  if (loading) {
    return <div style={{ padding: 24, color: '#6B7280', fontSize: 14 }}>Loading topology…</div>;
  }
  if (error) {
    return <div style={{ padding: 24, color: '#DC2626', fontSize: 14 }}>Error: {error}</div>;
  }
  // RUN-64 (FLOW-18 H9 fix): neutral empty-state replaces the old red error
  // "Topology response missing nodes or edges — backend may be unreachable."
  // which surfaced on DRAFT-editor pages even when the user hadn't saved yet.
  // Copy aligns with Impeccable H2 (plain language) + H9 (recovery path).
  if (isMissingTopology) {
    return (
      <div
        data-testid="topology-viewer-empty"
        style={{
          padding: 24,
          color: '#6B7280',
          fontSize: 14,
          border: '1px dashed #E5E7EB',
          borderRadius: 8,
          background: '#F9FAFB',
        }}
      >
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>
          No saved topology yet
        </div>
        <div>
          Save this flow to render its topology here. The DRAFT canvas above stays editable
          independently.
        </div>
      </div>
    );
  }
  if (!topology) {
    return (
      <div style={{ padding: 24, color: '#6B7280', fontSize: 14 }}>
        No topology found for flow: {flowId}
      </div>
    );
  }

  const suspensions = runState?.suspensions ?? [];
  const cycle2Traces = runState?.cycle2Traces ?? [];

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 500, fontFamily: 'sans-serif' }}>
      {/* Main DAG */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div
          style={{
            padding: '8px 16px',
            borderBottom: '1px solid #E5E7EB',
            background: '#F9FAFB',
            fontSize: 13,
            color: '#374151',
          }}
        >
          <strong>{topology.flowId}</strong>
          {topology.topologyId && (
            <span style={{ marginLeft: 8, color: '#9CA3AF' }}>· {topology.topologyId}</span>
          )}
          {topology.version && (
            <span style={{ marginLeft: 8, color: '#9CA3AF' }}>v{topology.version}</span>
          )}
        </div>
        <div style={{ height: 'calc(100% - 40px)' }} data-testid="topology-graph">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.35 }}
          >
            <Background color="#E5E7EB" gap={16} />
            <Controls position="bottom-right" showInteractive={false} />
          </ReactFlow>
        </div>
      </div>

      {/* Sidebar */}
      {runState && (
        <div
          style={{
            width: 280,
            borderLeft: '1px solid #E5E7EB',
            overflowY: 'auto',
            padding: 16,
            background: '#FAFAFA',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 12 }}>
            Run State
          </div>

          {/* Score spread chart */}
          {cycle2Traces.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                Cycle 2 score spread ({cycle2Traces.length} rounds)
              </div>
              <ScoreSpreadChart triples={cycle2Traces} />
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                Green = chosen · Orange = rejected
              </div>
            </div>
          )}

          {/* Suspensions */}
          {suspensions.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#C2410C', marginBottom: 8 }}>
                Suspended ({suspensions.length})
              </div>
              {suspensions.map((s) => (
                <SuspensionCard key={s.id} suspension={s} runId={runId!} />
              ))}
            </div>
          )}

          {/* Node state summary */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 6 }}>
              Node States
            </div>
            {Object.entries(runState.nodeStates).map(([nodeId, state]) => (
              <div
                key={nodeId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    color: '#374151',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 160,
                  }}
                >
                  {nodeId}
                </span>
                <span style={{ color: STATE_BORDER[state.status] ?? '#9CA3AF', fontWeight: 600 }}>
                  {state.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TopologyViewer;
