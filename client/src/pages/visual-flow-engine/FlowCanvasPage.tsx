/**
 * FlowCanvasPage — FLOW-18 T617/T618
 * Visual flow canvas editor. Shows BOLA guard + FLOW_IMMUTABLE state.
 * DRAFT flows allow edits. PUBLISHED flows are read-only (FLOW_IMMUTABLE guard).
 * Publication triggers DFS cycle detection + type compatibility validation.
 *
 * Design direction (Luba, RUN-47e):
 *   The flow designer must look like n8n / draw.io with a chat aside.
 *   Layout: 3-column on tenant-admin role —
 *     [ Node palette ] [ Canvas (ReactFlow) ] [ AI chat aside ]
 *   The canvas stays the focal point; the palette drags nodes in;
 *   the chat aside lets the user describe edits in natural language and
 *   receive canvas changes from the design agent.
 *
 * Track 0 Turn 14 (Track 4 — Option B locked, 2026-04-15):
 *   The canonical flow authoring surface is `/pages/DesignerPage.tsx`, which
 *   uses `FlowCanvas` from `../components/designer` as an embedded component.
 *   This page remains as the standalone FLOW-18 visual-flow editor (distinct
 *   mental model for immutability guards + publish flow), but new flow-editing
 *   features should go into DesignerPage, not here. Turn 15 wires the FLOW-18
 *   server services (T617-T620) into their own endpoints; this page stays
 *   focused on the FLOW-18 state-machine UX.
 *
 * Role-aware (RUN-47e, 3+1 cells — closes FLEET-VALIDATION-v5 §6 item #3):
 *   - tenant-admin     → n8n-style 3-column: Palette + Canvas + Chat aside
 *   - platform-admin   → cross-tenant audit (published flows, lock/unlock) + canvas
 *   - platform-support → read-only canvas viewer for debugging; disabled controls
 *   - Fallback         → original pre-RUN-47e page (backward compatible — keeps
 *                        all existing Playwright contracts for anonymous /
 *                        tenant-user / other roles unchanged)
 *
 * ALL existing data-testid attributes are preserved exactly:
 *   flow-canvas-page, flow-status-indicator, canvas-success, canvas-error,
 *   flow-id, flow-result-status, flow-id-input, add-edge-btn,
 *   save-canvas-submit, publish-flow-btn, flow-draft-preview-label,
 *   flow-draft-preview, topology-view-section, flow-canvas-topology.
 */
import React, { useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Node as RfNode,
  type Edge as RfEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Workflow,
  MessageSquare,
  Send,
  Bot,
  User,
  Lock,
  Shield,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { TopologyViewer } from '../../components/topology/TopologyViewer';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

interface FlowNode {
  nodeId: string;
  label: string;
  outputType: string;
}

interface FlowEdge {
  from: string;
  to: string;
  sourceOutputType: string;
  targetInputType: string;
}

// Node palette — drag-and-drop library, n8n-style
const PALETTE_NODES = [
  {
    type: 'input',
    label: 'Input',
    outputType: 'string',
    color: 'bg-blue-100 border-blue-300 text-blue-900',
  },
  {
    type: 'transform',
    label: 'Transform',
    outputType: 'number',
    color: 'bg-purple-100 border-purple-300 text-purple-900',
  },
  {
    type: 'filter',
    label: 'Filter',
    outputType: 'boolean',
    color: 'bg-amber-100 border-amber-300 text-amber-900',
  },
  {
    type: 'aggregate',
    label: 'Aggregate',
    outputType: 'object',
    color: 'bg-emerald-100 border-emerald-300 text-emerald-900',
  },
  {
    type: 'output',
    label: 'Output',
    outputType: 'string',
    color: 'bg-slate-100 border-slate-300 text-slate-900',
  },
];

interface ChatMessage {
  from: 'user' | 'agent';
  text: string;
  timestamp: string;
}

const SAMPLE_CHAT: ChatMessage[] = [
  {
    from: 'agent',
    text: "I'm your flow design assistant. Describe what you want to build and I'll update the canvas.",
    timestamp: '14:22',
  },
  {
    from: 'user',
    text: 'Add a filter between Input and Transform',
    timestamp: '14:23',
  },
  {
    from: 'agent',
    text: 'Added a Filter node between Input and Transform. The edge types match (string→boolean→number). Ready to save?',
    timestamp: '14:23',
  },
];

// Cross-tenant audit sample for platform-admin
interface PublishedFlow {
  flowId: string;
  flowName: string;
  tenantId: string;
  tenantName: string;
  publishedAt: string;
  version: string;
  locked: boolean;
}

const SAMPLE_PUBLISHED_FLOWS: PublishedFlow[] = [
  {
    flowId: 'flow-acme-onboarding',
    flowName: 'Acme Corp — Onboarding flow',
    tenantId: 'TNT-acme-corp',
    tenantName: 'Acme Corp',
    publishedAt: '2026-04-18 09:30',
    version: '3',
    locked: false,
  },
  {
    flowId: 'flow-bluebird-reports',
    flowName: 'Bluebird Media — Reports flow',
    tenantId: 'TNT-bluebird',
    tenantName: 'Bluebird Media',
    publishedAt: '2026-04-17 14:22',
    version: '2',
    locked: true,
  },
  {
    flowId: 'flow-castle-pipeline',
    flowName: 'Castle Analytics — Data pipeline flow',
    tenantId: 'TNT-castle',
    tenantName: 'Castle Analytics',
    publishedAt: '2026-04-15 11:00',
    version: '5',
    locked: false,
  },
];

export function FlowCanvasPage() {
  const { role } = useViewerRole();

  const [flowId, setFlowId] = useState('');
  const [flowStatus, setFlowStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [nodes, setNodes] = useState<FlowNode[]>([
    { nodeId: 'n1', label: 'Input', outputType: 'string' },
    { nodeId: 'n2', label: 'Transform', outputType: 'number' },
  ]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(SAMPLE_CHAT);

  const isPublished = flowStatus === 'PUBLISHED';

  // P14-A fix: render the DRAFT nodes/edges as a visual ReactFlow canvas so
  // the user sees a graph, not plain <span> lists. Auto-layout left-to-right.
  const draftRfNodes = useMemo<RfNode[]>(
    () =>
      nodes.map((n, i) => ({
        id: n.nodeId,
        position: { x: i * 200, y: 80 },
        data: { label: n.label },
        style: {
          background: '#F3F4F6',
          border: '1px solid #9CA3AF',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 12,
        },
      })),
    [nodes],
  );

  const draftRfEdges = useMemo<RfEdge[]>(
    () =>
      edges.map((e, i) => ({
        id: `e${i}`,
        source: e.from,
        target: e.to,
        animated: false,
        label:
          e.sourceOutputType === e.targetInputType
            ? `${e.sourceOutputType}`
            : `${e.sourceOutputType}→${e.targetInputType} ✗`,
        style: {
          stroke: e.sourceOutputType === e.targetInputType ? '#10B981' : '#EF4444',
        },
        labelStyle: { fontSize: 10 },
      })),
    [edges],
  );

  function addEdge() {
    if (nodes.length < 2) return;
    const newEdge: FlowEdge = {
      from: nodes[0].nodeId,
      to: nodes[1].nodeId,
      sourceOutputType: nodes[0].outputType,
      targetInputType: nodes[1].outputType,
    };
    setEdges((prev) => [...prev, newEdge]);
  }

  function addNodeFromPalette(palette: (typeof PALETTE_NODES)[number]) {
    if (isPublished) return;
    const nextId = `n${nodes.length + 1}`;
    setNodes((prev) => [
      ...prev,
      { nodeId: nextId, label: palette.label, outputType: palette.outputType },
    ]);
  }

  function handleSaveCanvas(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!flowId) {
      setError('Flow ID is required');
      return;
    }
    if (isPublished) {
      setError('This flow is published and cannot be modified.');
      return;
    }
    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      setResult({
        flowId,
        status: 'DRAFT',
        nodeCount: nodes.length,
        edgeCount: edges.length,
        updatedAt: new Date().toISOString(),
      });
    }, 300);
  }

  function handlePublish() {
    if (isPublished) return;
    setError(null);
    setStatus('loading');
    setTimeout(() => {
      setFlowStatus('PUBLISHED');
      setStatus('success');
      setResult({
        flowId,
        status: 'PUBLISHED',
        version: '2',
        publishedAt: new Date().toISOString(),
      });
    }, 300);
  }

  function handleChatSend(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [
      ...prev,
      { from: 'user', text, timestamp: now },
      {
        from: 'agent',
        text: `I'll draft that change for you on the canvas. (Stub response — full design-agent wiring lands in a later session.)`,
        timestamp: now,
      },
    ]);
    setChatInput('');
  }

  // ── Sub-components — shared between branches ────────────────────────────

  function StatusIndicator() {
    const statusLabel = flowStatus === 'PUBLISHED' ? 'Published' : 'Draft';
    return (
      <div
        className={`mb-4 p-3 rounded border ${isPublished ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-green-50 border-green-200 text-green-700'}`}
        data-testid="flow-status-indicator"
      >
        Status: <strong>{statusLabel}</strong>
        {isPublished && ' — Read-only (published flows cannot be modified)'}
      </div>
    );
  }

  function SuccessErrorBanners() {
    return (
      <>
        {status === 'success' && result && (
          <div
            data-testid="canvas-success"
            role="status"
            aria-live="polite"
            className="mb-4 p-4 bg-green-50 border border-green-200 rounded"
          >
            <p className="text-green-700 font-medium">
              {String(result['status']) === 'PUBLISHED' ? 'Flow published!' : 'Canvas saved!'}
            </p>
            <p className="text-sm text-green-600" data-testid="flow-id">
              ID: {String(result['flowId'])}
            </p>
            <p className="text-sm text-green-600" data-testid="flow-result-status">
              Status: {String(result['status']) === 'PUBLISHED' ? 'Published' : 'Draft'}
            </p>
          </div>
        )}
        {error && (
          <div
            data-testid="canvas-error"
            role="alert"
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700"
          >
            {error}
          </div>
        )}
      </>
    );
  }

  // The core canvas form + preview — shared by all branches.
  function CanvasForm({ disabled }: { disabled?: boolean }) {
    return (
      <form onSubmit={handleSaveCanvas} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Flow ID</label>
          <input
            data-testid="flow-id-input"
            value={flowId}
            onChange={(e) => setFlowId(e.target.value)}
            disabled={disabled || isPublished}
            className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
            placeholder="flow-my-workflow"
          />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Nodes ({nodes.length})
          </h2>
          {nodes.map((node, i) => (
            <div key={node.nodeId} className="flex gap-2 mb-1 items-center">
              <span className="text-xs text-gray-500 w-16">Node {i + 1}</span>
              <span className="text-sm font-medium">{node.label}</span>
              <span className="text-xs text-gray-400">outputs {node.outputType}</span>
            </div>
          ))}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Connections ({edges.length})
          </h2>
          {edges.map((edge, idx) => {
            const fromIndex = nodes.findIndex((n) => n.nodeId === edge.from);
            const toIndex = nodes.findIndex((n) => n.nodeId === edge.to);
            const fromLabel =
              fromIndex >= 0 ? `${nodes[fromIndex].label} (Node ${fromIndex + 1})` : edge.from;
            const toLabel =
              toIndex >= 0 ? `${nodes[toIndex].label} (Node ${toIndex + 1})` : edge.to;
            return (
              <div key={idx} className="text-xs text-gray-600 mb-1">
                {fromLabel} → {toLabel}
                <span
                  className={`ml-2 ${edge.sourceOutputType === edge.targetInputType ? 'text-green-600' : 'text-red-600'}`}
                >
                  ({edge.sourceOutputType} → {edge.targetInputType}
                  {edge.sourceOutputType !== edge.targetInputType ? ' — type mismatch' : ''})
                </span>
              </div>
            );
          })}
          {!isPublished && !disabled && (
            <button
              type="button"
              data-testid="add-edge-btn"
              onClick={addEdge}
              className="text-sm text-blue-600 underline mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              style={{ minHeight: '44px' }}
            >
              Add edge
            </button>
          )}
        </div>
        {/* RUN-95: Save is frequent + low-stakes → filled primary blue.
            Publish is rare + one-way → outlined secondary, not flex-1, with
            explicit help text. The previous two filled-equal-weight buttons
            (blue vs purple, both flex-1) created false parity per the refreshed
            critique doc's "primary-action" rule: one primary CTA per screen. */}
        <div className="flex items-center gap-3">
          <button
            data-testid="save-canvas-submit"
            type="submit"
            disabled={disabled || status === 'loading' || isPublished}
            className="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ minHeight: '44px' }}
          >
            {status === 'loading' ? 'Saving...' : 'Save Canvas'}
          </button>
          <button
            data-testid="publish-flow-btn"
            type="button"
            onClick={handlePublish}
            disabled={disabled || status === 'loading' || isPublished || !flowId}
            className="inline-flex items-center justify-center px-4 py-2 rounded font-medium border border-purple-300 text-purple-700 bg-white hover:bg-purple-50 hover:border-purple-500 disabled:text-gray-400 disabled:border-gray-200 disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 whitespace-nowrap"
            style={{ minHeight: '44px' }}
          >
            {isPublished ? 'Published ✓' : 'Publish flow'}
          </button>
        </div>
        {!isPublished && (
          <p className="mt-1.5 text-[11px] text-slate-500" data-testid="publish-flow-hint">
            Publishing is one-way — save and iterate freely before you publish.
          </p>
        )}
      </form>
    );
  }

  function CanvasPreview() {
    return (
      <div style={{ marginTop: 16, borderTop: '1px solid #E5E7EB', paddingTop: 12 }}>
        <div
          style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}
          data-testid="flow-draft-preview-label"
        >
          Draft canvas preview ({nodes.length} node{nodes.length !== 1 ? 's' : ''}, {edges.length}{' '}
          edge{edges.length !== 1 ? 's' : ''})
        </div>
        <div
          style={{ height: 400, border: '1px solid #E5E7EB', borderRadius: 6 }}
          data-testid="flow-draft-preview"
        >
          <ReactFlow
            nodes={draftRfNodes}
            edges={draftRfEdges}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={!isPublished}
            nodesConnectable={!isPublished}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>
    );
  }

  function TopologySection() {
    return (
      <div style={{ marginTop: 24, borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
        <div
          style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}
          data-testid="topology-view-section"
        >
          Saved topology — this flow's latest published version
        </div>
        <div style={{ height: 320 }} data-testid="flow-canvas-topology">
          <TopologyViewer flowId="FLOW-18" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4" data-testid="flow-canvas-page" data-viewer-role={role}>
      <RoleScopedView role={role} testIdPrefix="fce-role">
        {/* ─────────── Tenant-admin — n8n/draw.io 3-column layout ─────────── */}
        <RoleScopedView.Case when="tenant-admin">
          <main data-testid="fce-tenant-admin-view">
            <header className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Workflow size={22} strokeWidth={2} aria-hidden="true" />
                Visual Flow Canvas
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Drag nodes from the palette onto the canvas. Connect them with edges. Describe edits
                in plain language via the chat panel on the right.
              </p>
            </header>

            <StatusIndicator />
            <SuccessErrorBanners />

            {/* 3-column layout: Palette | Canvas | Chat aside */}
            <div data-testid="fce-n8n-layout" className="grid grid-cols-12 gap-4">
              {/* ── Palette (left, 2 cols on lg+) ── */}
              <aside
                data-testid="fce-palette"
                aria-label="Node palette"
                className="col-span-12 md:col-span-3 lg:col-span-2 bg-gray-50 border border-gray-200 rounded p-3 space-y-2 h-fit"
              >
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                  <Box size={12} strokeWidth={2} aria-hidden="true" />
                  Nodes
                </h2>
                {PALETTE_NODES.map((p) => (
                  <button
                    key={p.type}
                    type="button"
                    data-testid={`fce-palette-${p.type}`}
                    onClick={() => addNodeFromPalette(p)}
                    disabled={isPublished}
                    aria-label={`Add ${p.label} node to canvas`}
                    className={`w-full text-start px-3 py-2 rounded border ${p.color} text-xs font-medium hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{ minHeight: '44px' }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{p.label}</span>
                      <span className="text-xs opacity-60">{p.outputType}</span>
                    </div>
                  </button>
                ))}
                <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                  Click a node to add it to the canvas.
                </p>
              </aside>

              {/* ── Canvas (center, 7 cols on lg+) ── */}
              <section
                data-testid="fce-canvas-column"
                className="col-span-12 md:col-span-9 lg:col-span-7 bg-white border border-gray-200 rounded p-4"
              >
                <CanvasForm />
                <CanvasPreview />
              </section>

              {/* ── Chat aside (right, 3 cols on lg+) ── */}
              <aside
                data-testid="fce-chat-aside"
                aria-label="AI design assistant chat"
                className="col-span-12 lg:col-span-3 bg-white border border-gray-200 rounded flex flex-col"
                style={{ minHeight: 420 }}
              >
                <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2">
                  <MessageSquare
                    size={14}
                    strokeWidth={2}
                    className="text-blue-700"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-gray-900">Design assistant</span>
                </div>
                <div
                  data-testid="fce-chat-log"
                  className="flex-1 p-3 space-y-3 overflow-y-auto"
                  style={{ maxHeight: 380 }}
                >
                  {chatMessages.map((m, i) => (
                    <div
                      key={i}
                      data-testid={`fce-chat-msg-${i}`}
                      className={`text-xs ${m.from === 'user' ? 'text-end' : 'text-start'}`}
                    >
                      <div
                        className={`inline-block max-w-[90%] px-3 py-2 rounded-lg ${m.from === 'user' ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'bg-gray-100 text-gray-900 border border-gray-200'}`}
                      >
                        <div className="flex items-center gap-1 mb-1 opacity-70">
                          {m.from === 'user' ? (
                            <User size={10} strokeWidth={2} aria-hidden="true" />
                          ) : (
                            <Bot size={10} strokeWidth={2} aria-hidden="true" />
                          )}
                          <span>
                            {m.from === 'user' ? 'You' : 'Assistant'} · {m.timestamp}
                          </span>
                        </div>
                        <p>{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form
                  data-testid="fce-chat-form"
                  onSubmit={handleChatSend}
                  className="border-t border-gray-200 p-2 flex items-center gap-2"
                >
                  <label htmlFor="fce-chat-input" className="sr-only">
                    Describe a change
                  </label>
                  <input
                    id="fce-chat-input"
                    data-testid="fce-chat-input"
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Describe a change…"
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    data-testid="fce-chat-send"
                    aria-label="Send message to design assistant"
                    className="inline-flex items-center justify-center bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    style={{ minHeight: '44px', minWidth: '44px' }}
                  >
                    <Send size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                </form>
              </aside>
            </div>

            <TopologySection />
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Platform-admin — cross-tenant audit + canvas ─────────── */}
        <RoleScopedView.Case when="platform-admin">
          <main data-testid="fce-platform-admin-view" className="max-w-5xl">
            <header className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield size={22} strokeWidth={2} aria-hidden="true" />
                Visual Flow Engine — Cross-tenant audit
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Monitor published flows across all tenants. Lock flows for compliance investigation
                or unlock for tenant-admin edits.
              </p>
            </header>

            <section
              data-testid="fce-admin-published-list"
              aria-labelledby="fce-admin-published-heading"
              className="border border-gray-200 rounded bg-white mb-6"
            >
              <h2
                id="fce-admin-published-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Published flows ({SAMPLE_PUBLISHED_FLOWS.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_PUBLISHED_FLOWS.map((f) => (
                  <li
                    key={f.flowId}
                    data-testid={`fce-admin-published-${f.flowId}`}
                    className="p-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{f.flowName}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {f.tenantName} · version {f.version} · published {f.publishedAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.locked ? (
                        <span
                          data-testid={`fce-admin-locked-${f.flowId}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-red-200 bg-red-50 text-xs font-semibold text-red-800"
                        >
                          <Lock size={10} strokeWidth={2} aria-hidden="true" />
                          Locked
                        </span>
                      ) : (
                        <span
                          data-testid={`fce-admin-unlocked-${f.flowId}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800"
                        >
                          <CheckCircle2 size={10} strokeWidth={2} aria-hidden="true" />
                          Unlocked
                        </span>
                      )}
                      <button
                        type="button"
                        data-testid={`fce-admin-toggle-lock-${f.flowId}`}
                        aria-label={`${f.locked ? 'Unlock' : 'Lock'} ${f.flowName}`}
                        className="inline-flex items-center gap-1 border border-gray-300 text-gray-700 rounded px-3 py-2 text-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ minHeight: '44px' }}
                      >
                        {f.locked ? 'Unlock' : 'Lock'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <StatusIndicator />
            <SuccessErrorBanners />

            <section
              data-testid="fce-admin-canvas-column"
              className="bg-white border border-gray-200 rounded p-4"
            >
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Master canvas (platform-admin edit)
              </h2>
              <CanvasForm />
              <CanvasPreview />
            </section>

            <TopologySection />
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Platform-support — read-only canvas viewer ─────────── */}
        <RoleScopedView.Case when="platform-support">
          <main data-testid="fce-support-view" className="max-w-4xl">
            <header className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Workflow size={22} strokeWidth={2} aria-hidden="true" />
                Visual Flow Canvas (read-only)
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Inspect a tenant's flow to debug reported issues. Escalate to platform-admin for any
                edit.
              </p>
            </header>

            <div
              data-testid="fce-support-readonly-notice"
              role="note"
              className="p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2 mb-4"
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
              <span>
                Save / publish / add-edge controls are disabled for support access. Layout is
                preserved so you can describe the exact issue when escalating.
              </span>
            </div>

            <StatusIndicator />

            <fieldset
              data-testid="fce-support-readonly-wrapper"
              disabled
              aria-disabled="true"
              aria-label="Visual Flow Canvas (read-only)"
              className="m-0 p-0 border-0 opacity-75"
              style={{ pointerEvents: 'none' }}
            >
              <CanvasForm disabled />
              <CanvasPreview />
            </fieldset>

            <TopologySection />

            <a
              href="/support/escalate?topic=visual-flow-engine"
              data-testid="fce-support-escalate"
              className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              style={{ minHeight: '44px' }}
            >
              Escalate to platform-admin →
            </a>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Fallback — pre-RUN-47e layout preserved ─────────── */}
        {/* Keeps the existing Playwright contract for other roles (anonymous, */}
        {/* tenant-user, event-organiser, freelancer, etc.) — no regression.   */}
        <RoleScopedView.Fallback>
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Visual Flow Canvas</h1>

            <StatusIndicator />
            <SuccessErrorBanners />
            <CanvasForm />
            <CanvasPreview />
            <TopologySection />

            <div
              data-testid="fce-fallback-hint"
              role="note"
              className="mt-4 p-3 rounded border border-amber-200 bg-amber-50 text-xs text-amber-900 flex items-start gap-2"
            >
              <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
              Visual flow editing is typically used by tenant admins. Sign in as a tenant-admin for
              the full designer experience with node palette and design-assistant chat.
            </div>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
