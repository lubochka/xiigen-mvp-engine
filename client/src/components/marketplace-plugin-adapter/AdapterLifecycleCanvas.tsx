/**
 * AdapterLifecycleCanvas — FLOW-34 Grammar 4 Topology Canvas.
 *
 * Renders the 8-state plugin-adapter lifecycle as a ReactFlow DAG:
 *
 *   adapter-registered → handshake-pending → plugin-connected →
 *   payload-translating → payload-translated → synced
 *                                    └→ schema-mismatch (error)
 *                                    └→ rate-limited (error)
 *
 * Ref platform (MARKET-REFERENCE-CATALOG): Zapier app directory +
 * Stripe Connect integrations dashboard (lifecycle badges per installed
 * adapter) + n8n adapter detail view.
 *
 * Scope-reduced vs FLOW-29 reference: single lifecycle with pre-baked
 * run state, no run selector, no budget strip, no zoom controls.
 */

import React, { useMemo, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

type NodeState = 'idle' | 'running' | 'pending' | 'complete' | 'failed';

const STATE_STYLES: Record<NodeState, { border: string; dot: string; tint: string; text: string }> =
  {
    idle: { border: '#CBD5E1', dot: 'bg-slate-400', tint: '#F8FAFC', text: 'text-slate-500' },
    running: { border: '#F59E0B', dot: 'bg-amber-500', tint: '#FFFBEB', text: 'text-amber-700' },
    pending: { border: '#CBD5E1', dot: 'bg-slate-300', tint: '#F8FAFC', text: 'text-slate-500' },
    complete: {
      border: '#10B981',
      dot: 'bg-emerald-500',
      tint: '#ECFDF5',
      text: 'text-emerald-700',
    },
    failed: { border: '#EF4444', dot: 'bg-red-500', tint: '#FEF2F2', text: 'text-red-700' },
  };

const STATE_LABELS: Record<NodeState, string> = {
  idle: 'Idle',
  running: 'Running',
  pending: 'Pending',
  complete: 'Complete',
  failed: 'Failed',
};

interface ProcessDef {
  id: string;
  label: string;
  phase: 'Intake' | 'Handshake' | 'Translation' | 'Delivery' | 'Error';
  x: number;
  y: number;
  description: string;
  eventEmitted?: string;
  eventLabel?: string;
}

const PROCESSES: ProcessDef[] = [
  {
    id: 'adapter-registered',
    label: 'Adapter registered',
    phase: 'Intake',
    x: 0,
    y: 100,
    description:
      'Vendor publishes the adapter manifest. Tenant admin installs it from the marketplace catalog.',
    eventEmitted: 'adapter.registered',
    eventLabel: 'Adapter registered',
  },
  {
    id: 'handshake-pending',
    label: 'Handshake pending',
    phase: 'Handshake',
    x: 240,
    y: 40,
    description: 'OAuth / API-key authorization handshake initiated with the vendor.',
    eventEmitted: 'adapter.handshake.initiated',
    eventLabel: 'Handshake initiated',
  },
  {
    id: 'plugin-connected',
    label: 'Plugin connected',
    phase: 'Handshake',
    x: 240,
    y: 160,
    description: 'Credentials verified, plugin connection active.',
    eventEmitted: 'adapter.connected',
    eventLabel: 'Adapter connected',
  },
  {
    id: 'payload-translating',
    label: 'Payload translating',
    phase: 'Translation',
    x: 480,
    y: 40,
    description:
      'Runtime field-mapping + schema conversion between XIIGen event and vendor payload.',
    eventEmitted: 'adapter.payload.translating',
    eventLabel: 'Payload translating',
  },
  {
    id: 'payload-translated',
    label: 'Payload translated',
    phase: 'Translation',
    x: 480,
    y: 160,
    description: 'Payload ready for dispatch to the vendor endpoint.',
    eventEmitted: 'adapter.payload.translated',
    eventLabel: 'Payload translated',
  },
  {
    id: 'synced',
    label: 'Synced',
    phase: 'Delivery',
    x: 720,
    y: 100,
    description: 'Vendor confirmed receipt. Adapter is now in steady-state sync mode.',
    eventEmitted: 'adapter.synced',
    eventLabel: 'Adapter synced',
  },
  // Error branches
  {
    id: 'schema-mismatch',
    label: 'Schema mismatch',
    phase: 'Error',
    x: 720,
    y: 240,
    description:
      'Vendor payload shape changed or XIIGen event added a required field the adapter mapping does not cover. Retry after updating mapping.',
    eventEmitted: 'adapter.error.schema_mismatch',
    eventLabel: 'Schema mismatch detected',
  },
  {
    id: 'rate-limited',
    label: 'Rate limited',
    phase: 'Error',
    x: 960,
    y: 240,
    description: 'Vendor returned 429. Back off + retry with exponential backoff.',
    eventEmitted: 'adapter.error.rate_limited',
    eventLabel: 'Rate limit hit',
  },
];

const EDGES: { from: string; to: string; label?: string; error?: boolean }[] = [
  { from: 'adapter-registered', to: 'handshake-pending', label: 'install' },
  { from: 'handshake-pending', to: 'plugin-connected', label: 'credentials verified' },
  { from: 'plugin-connected', to: 'payload-translating', label: 'event received' },
  { from: 'payload-translating', to: 'payload-translated' },
  { from: 'payload-translated', to: 'synced', label: 'vendor 200 OK' },
  { from: 'payload-translating', to: 'schema-mismatch', label: 'field missing', error: true },
  { from: 'payload-translated', to: 'rate-limited', label: '429 returned', error: true },
];

// Pre-baked mid-run state: an adapter mid-delivery, with a prior error event
// documented but recovered. This mirrors the "mid-run stalled" demo pattern.
const RUN_STATE: Record<string, NodeState> = {
  'adapter-registered': 'complete',
  'handshake-pending': 'complete',
  'plugin-connected': 'complete',
  'payload-translating': 'complete',
  'payload-translated': 'running',
  synced: 'pending',
  'schema-mismatch': 'idle',
  'rate-limited': 'failed',
};

interface ProcessNodeData {
  label: string;
  state: NodeState;
  selected: boolean;
}

function ProcessNode({ data }: { data: ProcessNodeData }) {
  const styles = STATE_STYLES[data.state];
  return (
    <div
      data-testid={`adapter-node-${data.label.replace(/\s+/g, '-').toLowerCase()}`}
      data-node-state={data.state}
      data-node-selected={data.selected ? 'true' : 'false'}
      style={{
        minWidth: 200,
        padding: '8px 12px',
        borderRadius: 8,
        border: `2px solid ${styles.border}`,
        background: styles.tint,
        boxShadow: data.selected ? '0 0 0 3px rgba(59, 130, 246, 0.35)' : 'none',
        fontSize: 12,
      }}
    >
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${styles.dot}`} aria-hidden="true" />
        <span className="font-semibold text-slate-800">{data.label}</span>
      </div>
      <div className={`mt-1 text-[11px] ${styles.text}`}>{STATE_LABELS[data.state]}</div>
    </div>
  );
}

const nodeTypes = { processNode: ProcessNode };

export function AdapterLifecycleCanvas(): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>('payload-translated');

  const initialNodes: Node<ProcessNodeData>[] = useMemo(
    () =>
      PROCESSES.map((p) => ({
        id: p.id,
        type: 'processNode',
        position: { x: p.x, y: p.y },
        data: {
          label: p.label,
          state: RUN_STATE[p.id] ?? 'idle',
          selected: p.id === selectedId,
        },
      })),
    [selectedId],
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      EDGES.map((e, i) => ({
        id: `edge-${i}`,
        source: e.from,
        target: e.to,
        label: e.label,
        style: {
          stroke: e.error ? '#F87171' : '#94A3B8',
          strokeWidth: 1.5,
          strokeDasharray: e.error ? '5 3' : undefined,
        },
        labelStyle: { fontSize: 10, fill: e.error ? '#DC2626' : '#64748B' },
        labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.85 },
        markerEnd: { type: MarkerType.ArrowClosed, color: e.error ? '#F87171' : '#94A3B8' },
      })),
    [],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_evt: React.MouseEvent, node: Node) => {
    setSelectedId(node.id);
  }, []);

  const displayedNodes = nodes.map((n) => ({
    ...n,
    data: { ...(n.data as ProcessNodeData), selected: n.id === selectedId },
  }));

  const selectedProcess = PROCESSES.find((p) => p.id === selectedId);
  const selectedState = selectedProcess ? (RUN_STATE[selectedProcess.id] ?? 'idle') : 'idle';
  const selectedStyles = STATE_STYLES[selectedState];

  return (
    <>
      {/* Desktop: full ReactFlow canvas with side detail panel (>= lg, 1024px). */}
      <div
        className="hidden lg:flex h-[500px] border border-gray-200 rounded-lg overflow-hidden bg-white"
        data-testid="adapter-lifecycle-desktop"
      >
        <div className="flex-1 relative" data-testid="adapter-lifecycle-canvas">
          <ReactFlow
            nodes={displayedNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#E5E7EB" gap={24} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <aside
          className="w-80 border-l border-gray-200 bg-slate-50 p-4 overflow-y-auto"
          data-testid="adapter-detail-panel"
          data-node-selected={selectedId}
        >
          {selectedProcess && (
            <>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {selectedProcess.phase} phase
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                {selectedProcess.label}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
                  style={{
                    background: selectedStyles.tint,
                    borderColor: selectedStyles.border,
                  }}
                >
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${selectedStyles.dot}`}
                    aria-hidden="true"
                  />
                  <span className={selectedStyles.text}>{STATE_LABELS[selectedState]}</span>
                </span>
              </div>
              <p
                className="text-sm text-slate-700 leading-relaxed mb-4"
                data-testid="adapter-detail-description"
              >
                {selectedProcess.description}
              </p>
              {selectedProcess.eventEmitted && (
                <div className="text-xs" data-event-key={selectedProcess.eventEmitted}>
                  <div className="text-gray-500 mb-0.5">Emits event</div>
                  <span className="text-slate-800 bg-white border border-gray-200 px-2 py-0.5 rounded">
                    {selectedProcess.eventLabel ?? selectedProcess.eventEmitted}
                  </span>
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {/* Tablet/mobile fallback (< lg, 1024px): list of adapter states with
          connection hints. V-R5 BLOCKER fix — canvas clipped on narrow
          viewports, list is readable and preserves all information. */}
      <div
        className="lg:hidden border border-gray-200 rounded-lg bg-white overflow-hidden"
        data-testid="adapter-lifecycle-list"
        role="list"
        aria-label="Adapter lifecycle states"
      >
        {PROCESSES.map((p, idx) => {
          const state = RUN_STATE[p.id] ?? 'idle';
          const styles = STATE_STYLES[state];
          const outgoing = EDGES.filter((e) => e.from === p.id);
          const isSelected = p.id === selectedId;
          return (
            <div
              key={p.id}
              role="listitem"
              data-testid={`adapter-list-item-${p.id}`}
              data-node-state={state}
              data-node-selected={isSelected ? 'true' : 'false'}
              className={`px-4 py-3 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
              style={{ background: isSelected ? styles.tint : 'transparent' }}
            >
              <button
                type="button"
                onClick={() => setSelectedId(p.id)}
                className="w-full text-left"
                aria-label={`${p.label} — ${STATE_LABELS[state]}, ${p.phase} phase`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${styles.dot}`}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-slate-800 text-sm">{p.label}</span>
                  <span
                    className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                    style={{
                      background: styles.tint,
                      borderColor: styles.border,
                    }}
                  >
                    <span className={styles.text}>{STATE_LABELS[state]}</span>
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
                  {p.phase} phase
                </div>
                <p className="text-xs text-slate-600 leading-snug">{p.description}</p>
                {outgoing.length > 0 && (
                  <ul className="mt-2 space-y-0.5" data-testid={`adapter-list-next-${p.id}`}>
                    {outgoing.map((e) => {
                      const nextProcess = PROCESSES.find((q) => q.id === e.to);
                      if (!nextProcess) return null;
                      return (
                        <li
                          key={e.to}
                          className={`text-[11px] ${e.error ? 'text-red-600' : 'text-slate-500'}`}
                        >
                          <span aria-hidden="true">{e.error ? '\u2192 \u26A0' : '\u2192'}</span>{' '}
                          Next: <span className="font-medium">{nextProcess.label}</span>
                          {e.label ? ` (${e.label})` : ''}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {isSelected && p.eventEmitted && (
                  <div
                    className="mt-2 text-[11px]"
                    data-event-key={p.eventEmitted}
                    data-testid={`adapter-list-event-${p.id}`}
                  >
                    <span className="text-gray-500">Emits: </span>
                    <span className="text-slate-800 bg-white border border-gray-200 px-2 py-0.5 rounded">
                      {p.eventLabel ?? p.eventEmitted}
                    </span>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
