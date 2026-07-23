/**
 * Designer Components — SVG-based DAG editor.
 * Translated from React Native View layout → HTML SVG + div.
 *
 * FlowCanvas — SVG canvas rendering nodes + edges
 * FlowNode — rectangle node with fabric icon
 * FlowEdge — SVG line between nodes
 * FlowToolbar — action buttons (add node, zoom, fit)
 * NodePalette — draggable node type list
 * NodeConfigPanel — side panel for editing node config
 * layout — Sugiyama-style layered DAG layout algorithm
 */

import React, { useState, useMemo, useCallback } from 'react';

import type { FlowNodeDef, FlowEdgeDef, FlowDefinition } from '../../hooks/useFlowDefinition';

// ── Layout Algorithm ────────────────────────────────

export interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
  padding: number;
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  nodeWidth: 200,
  nodeHeight: 72,
  horizontalGap: 60,
  verticalGap: 100,
  padding: 40,
};

export function computeLayers(nodes: FlowNodeDef[], edges: FlowEdgeDef[]): string[][] {
  const ids = new Set(nodes.map((n) => n.id));
  const inDeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const id of ids) {
    inDeg.set(id, 0);
    adj.set(id, []);
  }
  for (const e of edges) {
    if (ids.has(e.source) && ids.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    }
  }
  const layers: string[][] = [];
  const assigned = new Set<string>();
  let cur = [...ids].filter((id) => (inDeg.get(id) ?? 0) === 0);
  if (cur.length === 0 && ids.size > 0) cur = [nodes[0].id];
  while (cur.length > 0) {
    layers.push([...cur]);
    for (const id of cur) assigned.add(id);
    const next: string[] = [];
    for (const id of cur) {
      for (const nb of adj.get(id) ?? []) {
        if (!assigned.has(nb) && !next.includes(nb)) {
          const allPred = edges
            .filter((e) => e.target === nb && ids.has(e.source))
            .every((e) => assigned.has(e.source));
          if (allPred) next.push(nb);
        }
      }
    }
    if (next.length === 0) {
      const rem = [...ids].filter((id) => !assigned.has(id));
      if (rem.length > 0) next.push(...rem);
    }
    cur = next;
  }
  return layers;
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
  layers: string[][];
}

export function applyLayout(
  nodes: FlowNodeDef[],
  edges: FlowEdgeDef[],
  cfg = DEFAULT_LAYOUT,
): LayoutResult {
  if (nodes.length === 0) return { positions: new Map(), width: 0, height: 0, layers: [] };
  const layers = computeLayers(nodes, edges);
  const positions = new Map<string, { x: number; y: number }>();
  const maxW = Math.max(...layers.map((l) => l.length), 1);
  const totalW = maxW * (cfg.nodeWidth + cfg.horizontalGap) - cfg.horizontalGap + 2 * cfg.padding;
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const lw = layer.length * (cfg.nodeWidth + cfg.horizontalGap) - cfg.horizontalGap;
    const sx = cfg.padding + (totalW - 2 * cfg.padding - lw) / 2;
    const y = cfg.padding + li * (cfg.nodeHeight + cfg.verticalGap);
    for (let ni = 0; ni < layer.length; ni++) {
      positions.set(layer[ni], { x: sx + ni * (cfg.nodeWidth + cfg.horizontalGap), y });
    }
  }
  const totalH =
    layers.length * (cfg.nodeHeight + cfg.verticalGap) - cfg.verticalGap + 2 * cfg.padding;
  return { positions, width: totalW, height: totalH, layers };
}

// ── FlowEdge ────────────────────────────────────────

interface FlowEdgeProps {
  edge: FlowEdgeDef;
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
  cfg: LayoutConfig;
}

export function FlowEdge({ edge, sourcePos, targetPos, cfg }: FlowEdgeProps) {
  const x1 = sourcePos.x + cfg.nodeWidth / 2;
  const y1 = sourcePos.y + cfg.nodeHeight;
  const x2 = targetPos.x + cfg.nodeWidth / 2;
  const y2 = targetPos.y;
  const my = (y1 + y2) / 2;
  return (
    <path
      d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
      stroke="#9CA3AF"
      strokeWidth={2}
      fill="none"
      markerEnd="url(#arrowhead)"
      data-testid={`edge-${edge.id}`}
    />
  );
}

// ── FlowNode ────────────────────────────────────────

interface FlowNodeProps {
  node: FlowNodeDef;
  pos: { x: number; y: number };
  cfg: LayoutConfig;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function FlowNode({ node, pos, cfg, selected, onSelect }: FlowNodeProps) {
  const typeColors: Record<string, string> = {
    start: '#059669',
    end: '#6B7280',
    service: '#2563EB',
    judge: '#7C3AED',
  };
  const borderColor = selected ? '#2563EB' : (typeColors[node.type] ?? '#E2E5EA');
  const topColor = typeColors[node.type] ?? '#E2E5EA';

  return (
    <g
      data-testid={`node-${node.id}`}
      onClick={() => onSelect(node.id)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={pos.x}
        y={pos.y}
        width={cfg.nodeWidth}
        height={cfg.nodeHeight}
        rx={8}
        fill="white"
        stroke={borderColor}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      <rect x={pos.x} y={pos.y} width={cfg.nodeWidth} height={4} rx={2} fill={topColor} />
      <text x={pos.x + 12} y={pos.y + 28} fontSize={13} fontWeight={600} fill="#111827">
        {node.label.length > 22 ? node.label.slice(0, 20) + '…' : node.label}
      </text>
      <text x={pos.x + 12} y={pos.y + 48} fontSize={11} fill="#6B7280">
        {node.factoryId || node.type}
      </text>
      {node.fabric && node.fabric !== 'CORE' && (
        <text x={pos.x + 12} y={pos.y + 63} fontSize={10} fill="#9CA3AF">
          {node.fabric}
        </text>
      )}
    </g>
  );
}

// ── FlowCanvas ──────────────────────────────────────

interface FlowCanvasProps {
  flow: FlowDefinition;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  /** When truthy, clicking a node sets it as the edge source; second click completes the edge. */
  connectMode?: boolean;
  onEdgeCreate?: (sourceId: string, targetId: string) => void;
  onConnectCancel?: () => void;
}

export function FlowCanvas({
  flow,
  selectedNodeId,
  onSelectNode,
  connectMode = false,
  onEdgeCreate,
  onConnectCancel,
}: FlowCanvasProps) {
  const cfg = DEFAULT_LAYOUT;
  const layout = useMemo(
    () => applyLayout(flow.nodes, flow.edges, cfg),
    [flow.nodes, flow.edges, cfg],
  );
  const [connectSource, setConnectSource] = useState<string | null>(null);

  const handleNodeClick = useCallback(
    (id: string) => {
      if (!connectMode) {
        onSelectNode(id);
        return;
      }
      if (!connectSource) {
        setConnectSource(id);
      } else if (connectSource !== id) {
        onEdgeCreate?.(connectSource, id);
        setConnectSource(null);
      }
    },
    [connectMode, connectSource, onSelectNode, onEdgeCreate],
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if ((e.target as HTMLElement).tagName === 'svg') {
        if (connectMode) {
          setConnectSource(null);
          onConnectCancel?.();
        } else {
          onSelectNode(null);
        }
      }
    },
    [connectMode, onSelectNode, onConnectCancel],
  );

  return (
    <div
      className={`border rounded-lg bg-gray-50 overflow-auto ${connectMode ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}
      data-testid="flow-canvas"
    >
      {connectMode && (
        <div
          className="px-3 py-1.5 bg-blue-50 border-b border-blue-200 text-xs text-blue-700"
          data-testid="connect-mode-banner"
        >
          {connectSource
            ? `Click a target node to connect from "${flow.nodes.find((n) => n.id === connectSource)?.label ?? connectSource}"`
            : 'Click a source node to start connecting'}
        </div>
      )}
      <svg
        width={Math.max(layout.width, 400)}
        height={Math.max(layout.height, 300)}
        onClick={handleCanvasClick}
        style={{ cursor: connectMode ? 'crosshair' : 'default' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
          </marker>
        </defs>
        {flow.edges.map((e) => {
          const sp = layout.positions.get(e.source);
          const tp = layout.positions.get(e.target);
          if (!sp || !tp) return null;
          return <FlowEdge key={e.id} edge={e} sourcePos={sp} targetPos={tp} cfg={cfg} />;
        })}
        {flow.nodes.map((n) => {
          const pos = layout.positions.get(n.id) ?? { x: 0, y: 0 };
          const isConnectSource = n.id === connectSource;
          return (
            <g key={n.id}>
              {isConnectSource && (
                <rect
                  x={pos.x - 3}
                  y={pos.y - 3}
                  width={cfg.nodeWidth + 6}
                  height={cfg.nodeHeight + 6}
                  rx={10}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  strokeDasharray="6 3"
                />
              )}
              <FlowNode
                node={n}
                pos={pos}
                cfg={cfg}
                selected={n.id === selectedNodeId && !connectMode}
                onSelect={handleNodeClick}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── NodePalette ─────────────────────────────────────

const NODE_TYPES = [
  { type: 'service', label: 'Service Node', desc: 'Factory-backed service' },
  { type: 'judge', label: 'Judge Gate', desc: 'Quality validation' },
  { type: 'start', label: 'Start', desc: 'Flow entry point' },
  { type: 'end', label: 'End', desc: 'Flow exit' },
];

interface NodePaletteProps {
  onAdd: (type: string) => void;
}

export function NodePalette({ onAdd }: NodePaletteProps) {
  return (
    <div className="space-y-1" data-testid="node-palette">
      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Add Node</h3>
      {NODE_TYPES.map((nt) => (
        <button
          key={nt.type}
          onClick={() => onAdd(nt.type)}
          className="w-full text-start px-3 py-2 text-sm rounded hover:bg-gray-100 border border-gray-200"
          data-testid={`palette-${nt.type}`}
        >
          <span className="font-medium text-gray-700">{nt.label}</span>
          <span className="block text-xs text-gray-400">{nt.desc}</span>
        </button>
      ))}
    </div>
  );
}

// ── NodeConfigPanel ─────────────────────────────────

interface NodeConfigPanelProps {
  node: FlowNodeDef;
  onUpdate: (updates: Partial<FlowNodeDef>) => void;
  onRemove: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onRemove }: NodeConfigPanelProps) {
  return (
    <div className="space-y-3" data-testid="node-config-panel">
      <h3 className="text-sm font-semibold text-gray-700">Node Configuration</h3>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Label</label>
        <input
          type="text"
          value={node.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded"
          data-testid="config-label"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Factory ID</label>
        <input
          type="text"
          value={node.factoryId}
          onChange={(e) => onUpdate({ factoryId: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded"
          data-testid="config-factoryId"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Interface</label>
        <input
          type="text"
          value={node.factoryInterface}
          onChange={(e) => onUpdate({ factoryInterface: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded"
          data-testid="config-interface"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Fabric</label>
        <select
          value={node.fabric}
          onChange={(e) => onUpdate({ fabric: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded"
          data-testid="config-fabric"
        >
          {['DATABASE', 'QUEUE', 'AI_ENGINE', 'RAG', 'CORE', 'FLOW_ENGINE'].map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Type: {node.type}</span>
        <span>ID: {node.id}</span>
      </div>
      <button
        onClick={onRemove}
        className="w-full py-1.5 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100"
        data-testid="config-remove"
      >
        Remove Node
      </button>
    </div>
  );
}

// ── FlowToolbar ─────────────────────────────────────

interface FlowToolbarProps {
  flowName: string;
  dirty: boolean;
  onSave: () => void;
  onNew: () => void;
  saving: boolean;
  /** Whether edge-connect mode is active. */
  connectMode?: boolean;
  onToggleConnect?: () => void;
}

export function FlowToolbar({
  flowName,
  dirty,
  onSave,
  onNew,
  saving,
  connectMode = false,
  onToggleConnect,
}: FlowToolbarProps) {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 bg-white border border-gray-200 rounded-lg mb-3"
      data-testid="flow-toolbar"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{flowName || 'Untitled Flow'}</h2>
        {dirty && (
          <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
            Unsaved
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {onToggleConnect && (
          <button
            onClick={onToggleConnect}
            className={`px-3 py-1 text-xs border rounded ${
              connectMode
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            data-testid="toolbar-connect"
            title="Toggle edge-connect mode"
          >
            {connectMode ? 'Connecting…' : 'Connect'}
          </button>
        )}
        <button
          onClick={onNew}
          className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
          data-testid="toolbar-new"
        >
          New Flow
        </button>
        <button
          onClick={onSave}
          disabled={!dirty || saving}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          data-testid="toolbar-save"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
